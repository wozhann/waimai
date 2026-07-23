import { describe, expect, it } from 'vitest';
import {
  CATALOG,
  createDefaultProfile,
  createMockProviders,
  rankPlatforms,
  searchAll,
  type Cart,
  type UserProfile,
} from '../src/index.js';

const providers = createMockProviders();

const smallCart: Cart = {
  restaurantId: 'rest-huangmenji',
  lines: [{ dishId: 'hmj-chicken-rice', qty: 1 }],
};

// A big KFC order: 2 burgers + nuggets + fries + cola = ¥87 subtotal.
const bigCart: Cart = {
  restaurantId: 'rest-kfc',
  lines: [
    { dishId: 'kfc-burger', qty: 2 },
    { dishId: 'kfc-nuggets', qty: 1 },
    { dishId: 'kfc-fries', qty: 1 },
    { dishId: 'kfc-cola', qty: 1 },
  ],
};

const noMembership: UserProfile = {
  memberships: { meituan: 'none', eleme: 'none', jd: 'none' },
  coupons: [],
};

describe('rankPlatforms', () => {
  it('ranks every carrying platform, cheapest first, with a consistent maxSaving', async () => {
    const result = await rankPlatforms(providers, smallCart, noMembership);
    expect(result.breakdowns).toHaveLength(3);
    const finals = result.breakdowns.map((b) => b.final);
    expect(finals).toEqual([...finals].sort((a, b) => a - b)); // ascending
    expect(result.cheapest!.final).toBe(finals[0]);
    expect(result.maxSaving).toBe(finals[finals.length - 1]! - finals[0]!);
  });

  it("JD's flat subsidy wins a small cart", async () => {
    const result = await rankPlatforms(providers, smallCart, noMembership);
    expect(result.cheapest!.platform).toBe('jd');
  });

  it("Meituan's stacked 满减 wins a big cart", async () => {
    const result = await rankPlatforms(providers, bigCart, noMembership);
    expect(result.cheapest!.platform).toBe('meituan');
  });

  it('personalization flips the winner: Ele.me membership makes it cheapest for a small cart', async () => {
    const asMember: UserProfile = {
      memberships: { meituan: 'none', eleme: 'premium', jd: 'none' },
      coupons: [],
    };
    const anon = await rankPlatforms(providers, smallCart, noMembership);
    const member = await rankPlatforms(providers, smallCart, asMember);

    expect(anon.cheapest!.platform).toBe('jd');
    expect(member.cheapest!.platform).toBe('eleme');

    // The Ele.me total must drop once membership benefits apply.
    const elemeAnon = anon.breakdowns.find((b) => b.platform === 'eleme')!;
    const elemeMember = member.breakdowns.find((b) => b.platform === 'eleme')!;
    expect(elemeMember.final).toBeLessThan(elemeAnon.final);
  });

  it('only prices platforms that carry the restaurant', async () => {
    const malatang: Cart = {
      restaurantId: 'rest-malatang',
      lines: [{ dishId: 'mlt-standard', qty: 1 }],
    };
    const result = await rankPlatforms(providers, malatang, noMembership);
    expect(result.breakdowns.map((b) => b.platform).sort()).toEqual(['eleme', 'meituan']);
  });

  it('default demo profile is usable end-to-end', async () => {
    const result = await rankPlatforms(providers, smallCart, createDefaultProfile());
    expect(result.cheapest).toBeDefined();
  });
});

describe('searchAll', () => {
  it('merges platform coverage per canonical restaurant', async () => {
    const hits = await searchAll(providers, '');
    expect(hits).toHaveLength(CATALOG.length);

    const malatang = hits.find((h) => h.restaurantId === 'rest-malatang')!;
    expect(malatang.platforms.sort()).toEqual(['eleme', 'meituan']);

    const kfc = hits.find((h) => h.restaurantId === 'rest-kfc')!;
    expect(kfc.platforms.sort()).toEqual(['eleme', 'jd', 'meituan']);
  });

  it('matches on dish name, not just shop name', async () => {
    const hits = await searchAll(providers, '牛肉');
    expect(hits.map((h) => h.restaurantId)).toContain('rest-lanzhou');
  });
});
