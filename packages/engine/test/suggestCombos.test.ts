import { describe, expect, it } from 'vitest';
import { suggestCombos } from '../src/engine/suggestCombos.js';
import { createDefaultProfile, createMockProviders } from '../src/providers/mock/index.js';

const providers = createMockProviders();
const profile = createDefaultProfile();

describe('suggestCombos', () => {
  it('returns combos sorted ascending by cheapest cross-platform final', async () => {
    const combos = await suggestCombos(providers, 'rest-kfc', profile);
    expect(combos.length).toBeGreaterThan(0);
    for (let i = 1; i < combos.length; i++) {
      expect(combos[i]!.cheapest.final).toBeGreaterThanOrEqual(combos[i - 1]!.cheapest.final);
    }
    // Invariant holds on every suggested breakdown.
    for (const c of combos) {
      expect(c.cheapest.final).toBe(c.cheapest.steps.reduce((s, x) => s + x.amount, 0));
    }
  });

  it('respects maxDishes and limit', async () => {
    const combos = await suggestCombos(providers, 'rest-kfc', profile, {
      maxDishes: 2,
      limit: 5,
    });
    expect(combos.length).toBeLessThanOrEqual(5);
    for (const c of combos) {
      expect(c.dishes.length).toBeLessThanOrEqual(2);
    }
  });

  it('要 terms must be covered, 不要 dishes never appear', async () => {
    const combos = await suggestCombos(providers, 'rest-kfc', profile, {
      filters: { include: ['汉堡'], exclude: ['可乐'] },
    });
    expect(combos.length).toBeGreaterThan(0);
    for (const c of combos) {
      expect(c.dishes.some((d) => d.dishId === 'kfc-burger')).toBe(true);
      expect(c.dishes.some((d) => d.dishId === 'kfc-cola')).toBe(false);
    }
  });

  it('budget caps the cheapest final price', async () => {
    const budget = 2500; // ¥25
    const combos = await suggestCombos(providers, 'rest-kfc', profile, { budget });
    expect(combos.length).toBeGreaterThan(0);
    for (const c of combos) {
      expect(c.cheapest.final).toBeLessThanOrEqual(budget);
    }
  });

  it('returns empty for a restaurant no provider carries', async () => {
    expect(await suggestCombos(providers, 'rest-nonexistent', profile)).toEqual([]);
  });
});
