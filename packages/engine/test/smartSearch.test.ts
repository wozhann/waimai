import { describe, expect, it } from 'vitest';
import { parseSmartQuery, smartSearch } from '../src/engine/smartSearch.js';
import { rankPlatforms } from '../src/engine/rank.js';
import { createDefaultProfile, createMockProviders } from '../src/providers/mock/index.js';

describe('parseSmartQuery', () => {
  it('parses spaced 要/不要 terms', () => {
    expect(parseSmartQuery('要汉堡 不要可乐 要炸鸡翅')).toEqual({
      include: ['汉堡', '炸鸡翅'],
      exclude: ['可乐'],
    });
  });

  it('parses markers without spaces', () => {
    expect(parseSmartQuery('要汉堡不要可乐')).toEqual({
      include: ['汉堡'],
      exclude: ['可乐'],
    });
  });

  it('treats leading text before the first marker as a wanted term', () => {
    expect(parseSmartQuery('汉堡 不要可乐')).toEqual({
      include: ['汉堡'],
      exclude: ['可乐'],
    });
  });

  it('splits multiple terms inside one segment', () => {
    expect(parseSmartQuery('要汉堡 薯条 不要可乐')).toEqual({
      include: ['汉堡', '薯条'],
      exclude: ['可乐'],
    });
  });

  it('returns null for a plain query with no markers', () => {
    expect(parseSmartQuery('牛肉面')).toBeNull();
  });
});

describe('smartSearch', () => {
  const providers = createMockProviders();

  it('builds a cart covering every 要 term and skipping 不要 dishes', async () => {
    const matches = await smartSearch(providers, {
      include: ['汉堡', '炸鸡翅'],
      exclude: ['可乐'],
    });

    expect(matches).toHaveLength(1);
    const kfc = matches[0]!;
    expect(kfc.restaurant.restaurantId).toBe('rest-kfc');
    expect(kfc.restaurant.platforms.sort()).toEqual(['eleme', 'jd', 'meituan']);
    expect(kfc.cart.lines).toEqual([
      { dishId: 'kfc-burger', qty: 1 },
      { dishId: 'kfc-wings', qty: 1 },
    ]);
  });

  it('matches every restaurant that carries a wanted dish', async () => {
    // Both 兰州拉面 and KFC sell a 可乐.
    const matches = await smartSearch(providers, { include: ['可乐'], exclude: [] });
    expect(matches.map((m) => m.restaurant.restaurantId).sort()).toEqual([
      'rest-kfc',
      'rest-lanzhou',
    ]);
  });

  it('不要 removes a dish from matching, not just from the cart', async () => {
    // The only 拉面 is 招牌牛肉拉面, which contains the refused 牛肉.
    const matches = await smartSearch(providers, { include: ['拉面'], exclude: ['牛肉'] });
    expect(matches).toHaveLength(0);
  });

  it('matches generic terms via dish tags, refusing excluded ones (要饮料 不要可乐)', async () => {
    const matches = await smartSearch(providers, { include: ['饮料'], exclude: ['可乐'] });
    const ids = matches.map((m) => m.restaurant.restaurantId);
    // Shops with a non-cola drink survive (酸梅汤 / 果茶 / 豆浆)…
    expect(ids).toContain('rest-malatang');
    expect(ids).toContain('rest-shuyi');
    // …while shops whose only 饮料 is 可乐 (refused) drop out.
    expect(ids).not.toContain('rest-kfc');
    expect(ids).not.toContain('rest-lanzhou');
    // No picked dish is ever a 可乐.
    for (const m of matches) {
      expect(m.pickedDishes.every((d) => !d.name.includes('可乐'))).toBe(true);
    }
  });

  it('returns no matches when there are no wanted terms', async () => {
    expect(await smartSearch(providers, { include: [], exclude: ['可乐'] })).toEqual([]);
  });

  it('produces a cart rankPlatforms can price on every carrying platform', async () => {
    const [match] = await smartSearch(providers, { include: ['汉堡'], exclude: [] });
    const ranked = await rankPlatforms(providers, match!.cart, createDefaultProfile());
    expect(ranked.breakdowns).toHaveLength(3);
    for (const b of ranked.breakdowns) {
      expect(b.final).toBe(b.steps.reduce((sum, s) => sum + s.amount, 0));
    }
  });
});
