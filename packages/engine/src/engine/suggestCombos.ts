import { rankPlatforms } from './rank.js';
import type { SmartQuery } from './smartSearch.js';
import type { PriceProvider } from '../providers/PriceProvider.js';
import type { Cart, Dish, PriceBreakdown, UserProfile } from '../types.js';

/** One auto-built dish combo, priced across every carrying platform. */
export interface ComboSuggestion {
  cart: Cart;
  dishes: { dishId: string; name: string }[];
  /** Full breakdown on the platform where this combo lands cheapest. */
  cheapest: PriceBreakdown;
  /** Fen saved vs the dearest platform for the same combo. */
  maxSaving: number;
}

export interface SuggestOptions {
  /** 要/不要 dish filters: every 要 term must be covered, 不要 dishes are dropped. */
  filters?: SmartQuery;
  /** Max dishes per combo (one of each). Default 4. */
  maxDishes?: number;
  /** Keep only combos whose cheapest final price (fen) is within this budget. */
  budget?: number;
  /** Max suggestions returned. Default 8. */
  limit?: number;
}

function dishHits(dish: Dish, term: string): boolean {
  return dish.name.includes(term) || (dish.tags?.some((t) => t.includes(term)) ?? false);
}

/**
 * Exhaustively price every dish combination at one restaurant and sort by the
 * cheapest cross-platform 到手价. Because 满减 thresholds are non-linear, this
 * legitimately surfaces combos where *adding* a dish lowers the final price —
 * exactly the kind of deal a human scrolling one app at a time never spots.
 */
export async function suggestCombos(
  providers: PriceProvider[],
  restaurantId: string,
  profile: UserProfile,
  options: SuggestOptions = {},
): Promise<ComboSuggestion[]> {
  const { filters, maxDishes = 4, budget, limit = 8 } = options;

  let listing = null;
  for (const provider of providers) {
    listing = await provider.getListing(restaurantId);
    if (listing) break;
  }
  if (!listing) return [];

  const pool = listing.dishes.filter(
    (d) => !filters?.exclude.some((term) => dishHits(d, term)),
  );

  // All subsets of the pool up to maxDishes, one of each dish.
  const combos: Dish[][] = [];
  const walk = (start: number, picked: Dish[]) => {
    if (picked.length > 0) combos.push([...picked]);
    if (picked.length >= maxDishes) return;
    for (let i = start; i < pool.length; i++) {
      const dish = pool[i];
      if (!dish) continue;
      picked.push(dish);
      walk(i + 1, picked);
      picked.pop();
    }
  };
  walk(0, []);

  const suggestions: ComboSuggestion[] = [];
  for (const combo of combos) {
    const coversWants =
      filters?.include.every((term) => combo.some((d) => dishHits(d, term))) ?? true;
    if (!coversWants) continue;

    const cart: Cart = {
      restaurantId,
      lines: combo.map((d) => ({ dishId: d.id, qty: 1 })),
    };
    const ranked = await rankPlatforms(providers, cart, profile);
    if (!ranked.cheapest) continue;
    if (budget !== undefined && ranked.cheapest.final > budget) continue;

    suggestions.push({
      cart,
      dishes: combo.map((d) => ({ dishId: d.id, name: d.name })),
      cheapest: ranked.cheapest,
      maxSaving: ranked.maxSaving,
    });
  }

  suggestions.sort((a, b) => a.cheapest.final - b.cheapest.final);
  return suggestions.slice(0, limit);
}
