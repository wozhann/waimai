import { describe, expect, it } from 'vitest';
import {
  computePrice,
  createMockProviders,
  MockProvider,
  PROFILES,
  yuan,
  type Cart,
  type PriceProvider,
} from '../src/index.js';

const providers = createMockProviders();
const byPlatform = Object.fromEntries(providers.map((p) => [p.platform, p])) as Record<
  string,
  PriceProvider
>;

async function price(platform: string, cart: Cart, tier: 'none' | 'member' | 'premium', coupons = []) {
  const provider = byPlatform[platform]!;
  const listing = (await provider.getListing(cart.restaurantId))!;
  return computePrice({
    listing,
    cart,
    membershipTier: tier,
    membershipBenefit: provider.getMembershipBenefit(tier),
    coupons,
  });
}

const singleChicken: Cart = {
  restaurantId: 'rest-huangmenji',
  lines: [{ dishId: 'hmj-chicken-rice', qty: 1 }],
};

describe('computePrice pipeline', () => {
  it('itemizes a simple order exactly (no membership, no coupons)', async () => {
    // 黄焖鸡米饭 ¥26 at 0.9km. Meituan: delivery 3 + 0.9 = 3.90, 打包 1.00, 补贴 -3.00.
    const mt = await price('meituan', singleChicken, 'none');
    expect(mt.subtotal).toBe(yuan(26));
    expect(mt.manjian).toBe(0); // 26 < 30 threshold
    expect(mt.deliveryFee).toBe(yuan(3.9));
    expect(mt.packagingFee).toBe(yuan(1));
    expect(mt.subsidy).toBe(-yuan(3));
    expect(mt.final).toBe(yuan(27.9));
  });

  it('holds the invariant: final === sum of step amounts', async () => {
    for (const platform of ['meituan', 'eleme', 'jd']) {
      const b = await price(platform, singleChicken, 'none');
      const sum = b.steps.reduce((s, step) => s + step.amount, 0);
      expect(b.final).toBe(sum);
    }
  });

  it('applies 满减 only once the subtotal crosses the threshold', async () => {
    const below = await price('meituan', singleChicken, 'none'); // 26 < 30
    expect(below.manjian).toBe(0);

    const above = await price(
      'meituan',
      { restaurantId: 'rest-huangmenji', lines: [
        { dishId: 'hmj-chicken-rice', qty: 1 },
        { dishId: 'hmj-soup', qty: 1 },
      ] }, // 26 + 6 = 32 >= 30
      'none',
    );
    expect(above.subtotal).toBe(yuan(32));
    expect(above.manjian).toBe(-yuan(8)); // 满30减8
  });

  it('caps membership delivery discount at the actual delivery fee', async () => {
    // JD premium grants ¥8 off delivery; huangmenji delivery is only 4 + 0.9 = 4.90.
    const jd = await price('jd', singleChicken, 'premium');
    // membershipDiscount = -(min(8, 4.90) + memberCoupon 5.00) = -(4.90 + 5.00)
    expect(jd.membershipDiscount).toBe(-yuan(9.9));
  });
});

describe('user coupons', () => {
  it('redeems a coupon only when its threshold is met', async () => {
    const mtCoupon = [
      { id: 'mt', label: 'x', platform: 'meituan' as const, threshold: yuan(40), discount: yuan(7) },
    ];
    // Subtotal 26 < 40 → coupon not applied.
    const small = await price('meituan', singleChicken, 'none', mtCoupon as never);
    expect(small.userCoupons).toBe(0);

    // Two chickens = 52 >= 40 → coupon applies.
    const big = await price(
      'meituan',
      { restaurantId: 'rest-huangmenji', lines: [{ dishId: 'hmj-chicken-rice', qty: 2 }] },
      'none',
      mtCoupon as never,
    );
    expect(big.userCoupons).toBe(-yuan(7));
  });
});

describe('search catalog', () => {
  it('JD does not carry the malatang shop', async () => {
    const jd = new MockProvider(PROFILES.jd);
    expect(await jd.getListing('rest-malatang')).toBeNull();

    const eleme = new MockProvider(PROFILES.eleme);
    expect(await eleme.getListing('rest-malatang')).not.toBeNull();
  });
});
