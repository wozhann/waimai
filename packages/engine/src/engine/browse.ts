import { rankPlatforms } from './rank.js';
import { CATALOG, type DishCategory } from '../providers/mock/catalog.js';
import type { PriceProvider } from '../providers/PriceProvider.js';
import type { Cart, Platform, UserProfile } from '../types.js';

/**
 * A single browsable dish, already priced across every platform for the current
 * user. This powers the "逛" feed: scroll dishes, see the cheapest app at a
 * glance, tap to open the full comparison. `cart` is a ready-to-compare
 * single-dish cart so the UI can jump straight to the ranked breakdown.
 */
export interface BrowseDish {
  dishId: string;
  name: string;
  category: DishCategory;
  tags: string[];
  restaurantId: string;
  restaurantName: string;
  cuisine: string;
  distanceKm: number;
  cart: Cart;
  /** Cheapest platform for this dish, and its personalized to-hand price (fen). */
  cheapestPlatform: Platform;
  cheapestFinal: number;
  /** Fen saved by picking the cheapest platform over the dearest. */
  maxSaving: number;
  platforms: Platform[];
}

export interface BrowseCategory {
  /** The DishCategory to filter on; '' means "all". */
  key: DishCategory | '';
  label: string;
}

/** Chips for the feed — the app-style sections users actually recognise. */
export const BROWSE_CATEGORIES: BrowseCategory[] = [
  { key: '', label: '全部' },
  { key: 'pinhaofan', label: '拼好饭' },
  { key: 'zhengcan', label: '品质正餐' },
  { key: 'hanbao', label: '汉堡快餐' },
  { key: 'mifan', label: '米饭快餐' },
  { key: 'mianshi', label: '面食' },
  { key: 'malatang', label: '麻辣烫' },
  { key: 'jiaozi', label: '饺子小吃' },
  { key: 'zhaji', label: '炸鸡炸串' },
  { key: 'tianpin', label: '甜品饮品' },
];

/**
 * Skip trivial add-ons (加饭, 可乐, …) from the "what to eat" feed. They aren't
 * standalone orders, and a tiny subtotal can price below zero once a platform's
 * flat subsidy is applied — an artifact that shouldn't headline the feed.
 */
const MIN_BROWSE_YUAN = 6;

export interface BrowseOptions {
  /** Keep only dishes in this section (empty/undefined = all). */
  category?: DishCategory | '';
  /**
   * `recommended` (default) leads with the dishes where the app you pick matters
   * most (biggest cross-platform saving) — the whole point of comparing.
   * `cheapest` is a plain low-to-high price sort.
   */
  sort?: 'recommended' | 'cheapest';
  limit?: number;
}

/**
 * Build the browsable dish feed: every catalog dish, priced across all platforms
 * for `profile`, ranked so the feed is useful to scroll. Pure read over the
 * provider seam — swap in a real provider and the feed becomes real.
 */
export async function browseDishes(
  providers: PriceProvider[],
  profile: UserProfile,
  options: BrowseOptions = {},
): Promise<BrowseDish[]> {
  const { category, sort = 'recommended', limit } = options;
  const out: BrowseDish[] = [];

  for (const restaurant of CATALOG) {
    for (const dish of restaurant.dishes) {
      if (dish.basePriceYuan < MIN_BROWSE_YUAN) continue;
      if (category && dish.category !== category) continue;
      const cart: Cart = {
        restaurantId: restaurant.id,
        lines: [{ dishId: dish.id, qty: 1 }],
      };
      const ranked = await rankPlatforms(providers, cart, profile);
      const cheapest = ranked.cheapest;
      if (!cheapest || cheapest.final <= 0) continue;
      out.push({
        dishId: dish.id,
        name: dish.name,
        category: dish.category,
        tags: dish.tags ?? [],
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        cuisine: restaurant.cuisine,
        distanceKm: restaurant.distanceKm,
        cart,
        cheapestPlatform: cheapest.platform,
        cheapestFinal: cheapest.final,
        maxSaving: ranked.maxSaving,
        platforms: restaurant.platforms,
      });
    }
  }

  if (sort === 'cheapest') {
    out.sort((a, b) => a.cheapestFinal - b.cheapestFinal);
  } else {
    out.sort((a, b) => b.maxSaving - a.maxSaving || a.cheapestFinal - b.cheapestFinal);
  }

  return typeof limit === 'number' ? out.slice(0, limit) : out;
}
