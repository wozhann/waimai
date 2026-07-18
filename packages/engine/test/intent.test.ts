import { describe, expect, it } from 'vitest';
import {
  buildMenuSnapshot,
  parseNaturalQuery,
  rankByPlan,
  suggestByIntent,
} from '../src/engine/intent.js';
import { createDefaultProfile, createMockProviders } from '../src/providers/mock/index.js';

const providers = createMockProviders();
const profile = createDefaultProfile();

describe('parseNaturalQuery', () => {
  it('extracts a 「N元以内」budget', () => {
    expect(parseNaturalQuery('想吃辣的，但是20元以内').budget).toBe(2000);
  });

  it('extracts 预算/不超过 budgets', () => {
    expect(parseNaturalQuery('预算25').budget).toBe(2500);
    expect(parseNaturalQuery('不超过 18 块').budget).toBe(1800);
  });

  it('returns no budget when none is stated', () => {
    expect(parseNaturalQuery('想吃点辣的').budget).toBeUndefined();
  });

  it('captures negated taste words as avoid', () => {
    expect(parseNaturalQuery('要辣的但不要牛肉').avoid).toContain('牛肉');
  });
});

describe('suggestByIntent', () => {
  it('ranks spicy+soup cravings so 麻辣烫 wins on fit', async () => {
    const query = parseNaturalQuery('想吃辣的，但是20元以内，有点汤更好了');
    const out = await suggestByIntent(providers, profile, query);
    expect(out.length).toBeGreaterThan(0);
    // 麻辣烫 has both 辣 and 汤 tags → highest match score.
    expect(out[0]!.restaurantId).toBe('rest-malatang');
    expect(out[0]!.matchScore).toBeGreaterThanOrEqual(2);
  });

  it('never exceeds a stated budget', async () => {
    const query = parseNaturalQuery('随便吃点，15元以内');
    const out = await suggestByIntent(providers, profile, query);
    expect(out.length).toBeGreaterThan(0);
    for (const s of out) {
      expect(s.cheapest.final).toBeLessThanOrEqual(1500);
    }
  });

  it('excludes dishes the user refused', async () => {
    const query = parseNaturalQuery('想吃辣的，不要炸鸡');
    const out = await suggestByIntent(providers, profile, query);
    for (const s of out) {
      expect(s.dishes.some((d) => d.dishId === 'kfc-wings')).toBe(false);
      expect(s.dishes.some((d) => d.dishId === 'kfc-nuggets')).toBe(false);
    }
  });

  it('every suggestion preserves the price invariant', async () => {
    const query = parseNaturalQuery('想喝汤，25元以内');
    const out = await suggestByIntent(providers, profile, query);
    for (const s of out) {
      expect(s.cheapest.final).toBe(
        s.cheapest.steps.reduce((sum, step) => sum + step.amount, 0),
      );
    }
  });
});

describe('rankByPlan (LLM-style plan)', () => {
  it('ranks a relevance-only plan (no aspects) by summed relevance then price', async () => {
    // Simulates an LLM picking dishes directly, with no taste aspects supplied.
    const out = await rankByPlan(providers, profile, {
      budget: 3000,
      matches: [
        { dishId: 'mlt-standard', relevance: 3, aspects: [] },
        { dishId: 'kfc-burger', relevance: 1, aspects: [] },
      ],
    });
    // Both restaurants qualify; 麻辣烫's higher relevance ranks it first.
    expect(out[0]!.restaurantId).toBe('rest-malatang');
    expect(out.some((s) => s.restaurantId === 'rest-kfc')).toBe(true);
  });

  it('honors excludeDishIds and budget from a plan', async () => {
    const menu = await buildMenuSnapshot(providers);
    expect(menu.length).toBe(4);
    const out = await rankByPlan(providers, profile, {
      budget: 2000,
      matches: menu.flatMap((r) =>
        r.dishes.map((d) => ({ dishId: d.dishId, relevance: 1, aspects: [] })),
      ),
      excludeDishIds: ['kfc-cola', 'lz-cola', 'mlt-drink'],
    });
    for (const s of out) {
      expect(s.cheapest.final).toBeLessThanOrEqual(2000);
      expect(s.dishes.some((d) => d.dishId.endsWith('cola') || d.dishId === 'mlt-drink')).toBe(
        false,
      );
    }
  });
});
