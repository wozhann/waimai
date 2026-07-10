import type {
  ComputeInput,
  Dish,
  PriceBreakdown,
  PriceStep,
  Promotion,
} from '../types.js';

/** Negate an amount, normalizing -0 to 0 so downstream equality/display is clean. */
function neg(n: number): number {
  return n === 0 ? 0 : -n;
}

/** Total number of item units in the cart (for per-item packaging fee). */
function totalQty(input: ComputeInput): number {
  return input.cart.lines.reduce((n, line) => n + line.qty, 0);
}

/** Item subtotal = Σ dish price × qty. Unknown dish ids are ignored. */
function computeSubtotal(input: ComputeInput): number {
  const byId = new Map<string, Dish>(input.listing.dishes.map((d) => [d.id, d]));
  return input.cart.lines.reduce((sum, line) => {
    const dish = byId.get(line.dishId);
    return dish ? sum + dish.basePrice * line.qty : sum;
  }, 0);
}

/** Best single 满减 discount whose threshold the subtotal meets (capped at subtotal). */
function bestManjian(promotions: Promotion[], subtotal: number): number {
  let best = 0;
  for (const p of promotions) {
    if (p.kind === 'manjian' && subtotal >= p.threshold) {
      best = Math.max(best, p.discount);
    }
  }
  return Math.min(best, subtotal);
}

/** Flat 配送费 model: base + per-km × distance, rounded to whole fen. */
function computeDeliveryFee(input: ComputeInput): number {
  const { baseDeliveryFee, perKmDeliveryFee, distanceKm } = input.listing;
  return baseDeliveryFee + Math.round(perKmDeliveryFee * distanceKm);
}

/**
 * Price one platform's cart into a fully itemized breakdown.
 *
 * Discounts and fees are applied in the order Chinese platforms actually use:
 *   1. item subtotal
 *   2. − 满减 (measured against the original subtotal)
 *   3. − 店铺红包 and − user coupons (each gated by its own threshold on subtotal)
 *   4. + 配送费  + 打包费
 *   5. − 会员 benefits (delivery reduction, capped; plus a flat member 红包)
 *   6. − 平台补贴
 *
 * Invariant: the returned `final` equals the sum of `steps[].amount`.
 */
export function computePrice(input: ComputeInput): PriceBreakdown {
  const { listing, membershipBenefit, coupons } = input;
  const subtotal = computeSubtotal(input);

  // 2. 满减 (thresholds measured against the original item subtotal).
  const manjian = neg(bestManjian(listing.promotions, subtotal));

  // 3a. 店铺红包 — every qualifying shop coupon on the listing stacks.
  const shopCoupons = neg(
    listing.promotions
      .filter((p) => p.kind === 'shopCoupon' && subtotal >= p.threshold)
      .reduce((sum, p) => sum + (p.kind === 'shopCoupon' ? p.discount : 0), 0),
  );

  // 3b. User-held coupons for this platform that meet their threshold.
  const userCoupons = neg(
    coupons.filter((c) => subtotal >= c.threshold).reduce((sum, c) => sum + c.discount, 0),
  );

  // 4. Fees.
  const deliveryFee = computeDeliveryFee(input);
  const packagingFee = listing.packagingFeePerItem * totalQty(input);

  // 5. Membership: delivery reduction (capped at the delivery fee) + flat member红包.
  const deliveryReduction = Math.min(membershipBenefit.deliveryDiscount, deliveryFee);
  const membershipDiscount = neg(deliveryReduction + membershipBenefit.memberCoupon);

  // 6. 平台补贴.
  const subsidy = neg(
    listing.promotions
      .filter((p) => p.kind === 'subsidy')
      .reduce((sum, p) => sum + (p.kind === 'subsidy' ? p.amount : 0), 0),
  );

  const steps: PriceStep[] = [
    { label: '商品小计', amount: subtotal },
    { label: '满减', amount: manjian },
    { label: '店铺红包', amount: shopCoupons },
    { label: '优惠券', amount: userCoupons },
    { label: '配送费', amount: deliveryFee },
    { label: '打包费', amount: packagingFee },
    { label: '会员优惠', amount: membershipDiscount },
    { label: '平台补贴', amount: subsidy },
  ].filter((s) => s.amount !== 0);

  const final = steps.reduce((sum, s) => sum + s.amount, 0);

  return {
    platform: listing.platform,
    subtotal,
    manjian,
    shopCoupons,
    userCoupons,
    deliveryFee,
    packagingFee,
    membershipDiscount,
    subsidy,
    final,
    steps,
  };
}
