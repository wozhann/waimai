import { describe, expect, it } from 'vitest';
import { browseDishes, createMockProviders, createDefaultProfile } from '../src/index.js';

const providers = createMockProviders();
const profile = createDefaultProfile();

describe('browseDishes', () => {
  it('returns a priced feed with a ready-to-compare single-dish cart', async () => {
    const feed = await browseDishes(providers, profile);
    expect(feed.length).toBeGreaterThan(0);
    for (const item of feed) {
      expect(item.cheapestFinal).toBeGreaterThan(0);
      expect(item.maxSaving).toBeGreaterThanOrEqual(0);
      // The cart is one dish, at the dish's own restaurant — tap-to-compare ready.
      expect(item.cart.restaurantId).toBe(item.restaurantId);
      expect(item.cart.lines).toEqual([{ dishId: item.dishId, qty: 1 }]);
    }
  });

  it('sorts cheapest-first when asked', async () => {
    const feed = await browseDishes(providers, profile, { sort: 'cheapest' });
    const finals = feed.map((d) => d.cheapestFinal);
    expect(finals).toEqual([...finals].sort((a, b) => a - b));
  });

  it('leads with the biggest cross-app saving by default', async () => {
    const feed = await browseDishes(providers, profile);
    const savings = feed.map((d) => d.maxSaving);
    expect(savings).toEqual([...savings].sort((a, b) => b - a));
  });

  it('filters by tag', async () => {
    const spicy = await browseDishes(providers, profile, { tag: '辣' });
    expect(spicy.length).toBeGreaterThan(0);
    for (const item of spicy) expect(item.tags).toContain('辣');
  });

  it('respects the limit', async () => {
    const feed = await browseDishes(providers, profile, { limit: 3 });
    expect(feed).toHaveLength(3);
  });
});
