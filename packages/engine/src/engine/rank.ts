import { computePrice } from './computePrice.js';
import type { PriceProvider } from '../providers/PriceProvider.js';
import type {
  Cart,
  PriceBreakdown,
  RestaurantSummary,
  UserProfile,
} from '../types.js';

export interface RankedResult {
  /** Per-platform breakdowns, cheapest `final` first. */
  breakdowns: PriceBreakdown[];
  /** The cheapest breakdown (undefined only if no platform carries the restaurant). */
  cheapest?: PriceBreakdown;
  /** Fen saved by choosing the cheapest over the most expensive platform. */
  maxSaving: number;
}

/**
 * Price the same cart on every provider that carries the restaurant, applying
 * the user's personalization, and rank the platforms by final price.
 */
export async function rankPlatforms(
  providers: PriceProvider[],
  cart: Cart,
  profile: UserProfile,
): Promise<RankedResult> {
  const breakdowns: PriceBreakdown[] = [];

  for (const provider of providers) {
    const listing = await provider.getListing(cart.restaurantId);
    if (!listing) continue; // platform doesn't carry this restaurant

    const tier = profile.memberships[provider.platform];
    breakdowns.push(
      computePrice({
        listing,
        cart,
        membershipTier: tier,
        membershipBenefit: provider.getMembershipBenefit(tier),
        coupons: profile.coupons.filter((c) => c.platform === provider.platform),
      }),
    );
  }

  breakdowns.sort((a, b) => a.final - b.final);

  const cheapest = breakdowns[0];
  const dearest = breakdowns[breakdowns.length - 1];
  const maxSaving = cheapest && dearest ? dearest.final - cheapest.final : 0;

  return { breakdowns, cheapest, maxSaving };
}

/** Merge per-provider search hits into canonical restaurants (deduped by id). */
export async function searchAll(
  providers: PriceProvider[],
  query: string,
): Promise<RestaurantSummary[]> {
  const merged = new Map<string, RestaurantSummary>();

  for (const provider of providers) {
    for (const hit of await provider.searchRestaurants(query)) {
      const existing = merged.get(hit.restaurantId);
      if (existing) {
        for (const p of hit.platforms) {
          if (!existing.platforms.includes(p)) existing.platforms.push(p);
        }
      } else {
        merged.set(hit.restaurantId, { ...hit, platforms: [...hit.platforms] });
      }
    }
  }

  return [...merged.values()];
}
