/**
 * Core domain model for the waimai price-comparison engine.
 *
 * All monetary amounts are integers in 分 (fen), where 100 fen = 1 元 (yuan).
 * Working in integer fen avoids floating-point rounding errors when stacking
 * discounts; use `formatYuan` from ./money to display a value.
 */

export type Platform = 'meituan' | 'eleme' | 'jd';

export const PLATFORMS: Platform[] = ['meituan', 'eleme', 'jd'];

export const PLATFORM_LABELS: Record<Platform, string> = {
  meituan: '美团',
  eleme: '饿了么',
  jd: '京东外卖',
};

/** A single menu item. */
export interface Dish {
  id: string;
  name: string;
  /** Platform-adjusted price in fen (the same dish can list differently per platform). */
  basePrice: number;
  /** Search keywords for generic terms the name doesn't contain (香辣鸡腿堡 → 汉堡). */
  tags?: string[];
}

/**
 * A store-side promotion attached to a platform's listing of a restaurant.
 * Tagged union so new promotion kinds can be added without touching the pipeline.
 */
export type Promotion =
  /** 满减: when item subtotal >= threshold, take `discount` off. */
  | { kind: 'manjian'; threshold: number; discount: number }
  /** 店铺红包: a shop coupon with its own minimum-spend threshold. */
  | { kind: 'shopCoupon'; threshold: number; discount: number }
  /** 平台补贴: a flat platform subsidy applied to the order total. */
  | { kind: 'subsidy'; amount: number };

/** Membership levels a user can hold on a platform. */
export type MembershipTier = 'none' | 'member' | 'premium';

export const MEMBERSHIP_TIERS: MembershipTier[] = ['none', 'member', 'premium'];

/** What a given membership tier grants on a given platform. */
export interface MembershipBenefit {
  tier: MembershipTier;
  label: string;
  /** 免/减配送费: fen taken off the delivery fee (capped at the delivery fee). */
  deliveryDiscount: number;
  /** 会员红包: a flat, threshold-free discount on the order total, in fen. */
  memberCoupon: number;
}

/** A platform's full listing of one restaurant, everything needed to price a cart. */
export interface RestaurantListing {
  restaurantId: string;
  name: string;
  platform: Platform;
  distanceKm: number;
  dishes: Dish[];
  promotions: Promotion[];
  /** 打包费 charged per item unit, in fen. */
  packagingFeePerItem: number;
  /** 起送/基础配送费 in fen. */
  baseDeliveryFee: number;
  /** Additional 配送费 in fen per km of distance. */
  perKmDeliveryFee: number;
}

/** A coupon the user personally holds, tied to one platform. */
export interface UserCoupon {
  id: string;
  label: string;
  platform: Platform;
  /** Minimum item subtotal (fen) required to redeem. */
  threshold: number;
  discount: number;
}

/** The user's personalization: membership per platform + owned coupons. */
export interface UserProfile {
  memberships: Record<Platform, MembershipTier>;
  coupons: UserCoupon[];
}

export interface CartLine {
  dishId: string;
  qty: number;
}

/** A selection of dishes at one (canonical) restaurant. */
export interface Cart {
  restaurantId: string;
  lines: CartLine[];
}

/** One labelled contribution to the final price. Negative = discount. */
export interface PriceStep {
  label: string;
  amount: number;
}

/**
 * A fully itemized price for one platform. Invariant: `final` equals the sum of
 * every `steps[].amount`, so the UI can render the steps and trust the total.
 */
export interface PriceBreakdown {
  platform: Platform;
  subtotal: number;
  manjian: number;
  shopCoupons: number;
  userCoupons: number;
  deliveryFee: number;
  packagingFee: number;
  membershipDiscount: number;
  subsidy: number;
  final: number;
  steps: PriceStep[];
}

/** Everything `computePrice` needs to price one platform's cart. */
export interface ComputeInput {
  listing: RestaurantListing;
  cart: Cart;
  membershipTier: MembershipTier;
  /** Benefit resolved for `membershipTier` on this platform. */
  membershipBenefit: MembershipBenefit;
  /** The user's coupons for THIS platform only. */
  coupons: UserCoupon[];
}

/** A lightweight search hit used before a full listing is fetched. */
export interface RestaurantSummary {
  restaurantId: string;
  name: string;
  cuisine: string;
  distanceKm: number;
  /** Platforms that carry this restaurant. */
  platforms: Platform[];
}
