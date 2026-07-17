import type { PriceProvider } from '../PriceProvider.js';
import type {
  MembershipBenefit,
  MembershipTier,
  Promotion,
  RestaurantListing,
  RestaurantSummary,
} from '../../types.js';
import { CATALOG, type CanonicalRestaurant } from './catalog.js';
import type { PlatformProfile } from './profiles.js';

/**
 * A simulated PriceProvider: it overlays one platform's pricing profile onto the
 * shared canonical catalog. Swapping this for a real (e.g. affiliate-API) adapter
 * behind the same interface would leave the engine and UI untouched.
 */
export class MockProvider implements PriceProvider {
  readonly platform;

  constructor(
    private readonly profile: PlatformProfile,
    private readonly catalog: CanonicalRestaurant[] = CATALOG,
  ) {
    this.platform = profile.platform;
  }

  private carries(r: CanonicalRestaurant): boolean {
    return r.platforms.includes(this.platform);
  }

  async searchRestaurants(query: string): Promise<RestaurantSummary[]> {
    const q = query.trim().toLowerCase();
    return this.catalog
      .filter(this.carries, this)
      .filter(
        (r) =>
          q === '' ||
          r.name.toLowerCase().includes(q) ||
          r.cuisine.toLowerCase().includes(q) ||
          r.dishes.some(
            (d) =>
              d.name.toLowerCase().includes(q) ||
              d.tags?.some((t) => t.toLowerCase().includes(q)),
          ),
      )
      .map((r) => ({
        restaurantId: r.id,
        name: r.name,
        cuisine: r.cuisine,
        distanceKm: r.distanceKm,
        platforms: [this.platform],
      }));
  }

  async getListing(restaurantId: string): Promise<RestaurantListing | null> {
    const r = this.catalog.find((x) => x.id === restaurantId);
    if (!r || !this.carries(r)) return null;

    const dishes = r.dishes.map((d) => ({
      id: d.id,
      name: d.name,
      basePrice: Math.round(d.basePriceYuan * 100 * this.profile.dishPriceFactor),
      tags: d.tags,
    }));

    const promotions: Promotion[] = [
      ...this.profile.manjian.map(
        (m): Promotion => ({ kind: 'manjian', threshold: m.threshold, discount: m.discount }),
      ),
    ];
    if (this.profile.shopCoupon) {
      promotions.push({
        kind: 'shopCoupon',
        threshold: this.profile.shopCoupon.threshold,
        discount: this.profile.shopCoupon.discount,
      });
    }
    if (this.profile.subsidy > 0) {
      promotions.push({ kind: 'subsidy', amount: this.profile.subsidy });
    }

    return {
      restaurantId: r.id,
      name: r.name,
      platform: this.platform,
      distanceKm: r.distanceKm,
      dishes,
      promotions,
      packagingFeePerItem: this.profile.packagingFeePerItem,
      baseDeliveryFee: this.profile.baseDeliveryFee,
      perKmDeliveryFee: this.profile.perKmDeliveryFee,
    };
  }

  getMembershipBenefit(tier: MembershipTier): MembershipBenefit {
    return this.profile.membership[tier];
  }
}
