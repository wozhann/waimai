import { yuan } from '../../money.js';
import type { MembershipBenefit, MembershipTier, Platform } from '../../types.js';

/**
 * Per-platform pricing "personality". Overlaying these on the shared catalog is
 * what makes the comparison interesting: each app leans on a different lever, so
 * the cheapest platform genuinely changes with cart size and membership.
 *
 *  - 美团  (Meituan): aggressive 满减 tiers, small subsidy — wins big carts.
 *  - 饿了么 (Ele.me):  cheap delivery + strong 会员红包 — wins for members / small carts.
 *  - 京东  (JD):       huge flat platform subsidy (new-entrant land grab) — wins small carts.
 */
export interface ManjianTier {
  threshold: number;
  discount: number;
}

export interface PlatformProfile {
  platform: Platform;
  /** Multiplier applied to every canonical dish price on this platform. */
  dishPriceFactor: number;
  manjian: ManjianTier[];
  shopCoupon?: { threshold: number; discount: number };
  baseDeliveryFee: number;
  perKmDeliveryFee: number;
  packagingFeePerItem: number;
  subsidy: number;
  membership: Record<MembershipTier, MembershipBenefit>;
}

function membership(
  memberDelivery: number,
  memberCoupon: number,
  premiumDelivery: number,
  premiumCoupon: number,
): Record<MembershipTier, MembershipBenefit> {
  return {
    none: { tier: 'none', label: '非会员', deliveryDiscount: 0, memberCoupon: 0 },
    member: {
      tier: 'member',
      label: '会员',
      deliveryDiscount: memberDelivery,
      memberCoupon,
    },
    premium: {
      tier: 'premium',
      label: '超级会员',
      deliveryDiscount: premiumDelivery,
      memberCoupon: premiumCoupon,
    },
  };
}

export const PROFILES: Record<Platform, PlatformProfile> = {
  meituan: {
    platform: 'meituan',
    dishPriceFactor: 1.0,
    manjian: [
      { threshold: yuan(30), discount: yuan(8) },
      { threshold: yuan(50), discount: yuan(15) },
      { threshold: yuan(80), discount: yuan(25) },
    ],
    baseDeliveryFee: yuan(3),
    perKmDeliveryFee: yuan(1),
    packagingFeePerItem: yuan(1),
    subsidy: yuan(3),
    membership: membership(yuan(2), yuan(3), yuan(4), yuan(5)),
  },
  eleme: {
    platform: 'eleme',
    dishPriceFactor: 1.03,
    manjian: [{ threshold: yuan(35), discount: yuan(6) }],
    shopCoupon: { threshold: yuan(20), discount: yuan(3) },
    baseDeliveryFee: yuan(1),
    perKmDeliveryFee: yuan(0.5),
    packagingFeePerItem: yuan(1.5),
    subsidy: yuan(2),
    membership: membership(yuan(3), yuan(5), yuan(5), yuan(8)),
  },
  jd: {
    platform: 'jd',
    dishPriceFactor: 1.0,
    manjian: [{ threshold: yuan(40), discount: yuan(10) }],
    baseDeliveryFee: yuan(4),
    perKmDeliveryFee: yuan(1),
    packagingFeePerItem: yuan(1),
    subsidy: yuan(10),
    membership: membership(yuan(4), yuan(3), yuan(8), yuan(5)),
  },
};
