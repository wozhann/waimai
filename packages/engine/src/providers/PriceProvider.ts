import type {
  MembershipBenefit,
  MembershipTier,
  Platform,
  RestaurantListing,
  RestaurantSummary,
} from '../types.js';

/**
 * The seam between the pricing engine and a data source.
 *
 * Every platform (Meituan, Ele.me, JD …) is implemented behind this interface.
 * Today the implementations are mocks backed by seeded data; a real affiliate
 * API or other adapter can be dropped in later without changing the engine or UI.
 *
 * Methods are async so a real, network-backed adapter fits the same shape.
 */
export interface PriceProvider {
  readonly platform: Platform;

  /** Restaurants on this platform whose name or cuisine matches `query`. */
  searchRestaurants(query: string): Promise<RestaurantSummary[]>;

  /** This platform's full listing for a restaurant, or null if it doesn't carry it. */
  getListing(restaurantId: string): Promise<RestaurantListing | null>;

  /** What a membership tier grants on this platform. */
  getMembershipBenefit(tier: MembershipTier): MembershipBenefit;
}
