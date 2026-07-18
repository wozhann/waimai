import { rankPlatforms, searchAll } from './rank.js';
import type { PriceProvider } from '../providers/PriceProvider.js';
import type { Cart, Dish, PriceBreakdown, UserProfile } from '../types.js';

/**
 * A parsed free-text craving, e.g. 「想吃辣的，但是20元以内，有点汤更好了」.
 *
 * This deterministic parser is the offline fallback: it pulls a budget out with
 * regex and treats the rest of the sentence as a bag of taste words matched by
 * substring against each dish's menu tags. It does NOT truly understand language.
 * An LLM matcher (see `IntentPlan`) produces the same downstream plan far better.
 */
export interface NaturalQuery {
  raw: string;
  /** Hard spend cap in fen, if the text names one (「20元以内」→ 2000). */
  budget?: number;
  /** Taste/category words the user refused (「不要辣」→ ['辣']). */
  avoid: string[];
}

/** Pull a budget (fen) out of free text, or undefined if none is stated. */
function extractBudget(raw: string): number | undefined {
  const patterns = [
    /(?:预算|不超过|最多|控制在|人均)\s*[¥￥]?\s*(\d+(?:\.\d+)?)/,
    /(\d+(?:\.\d+)?)\s*(?:元|块钱|块|rmb)?\s*(?:以内|以下|之内|封顶|左右|上下|封頂)/,
    /[<≤]\s*[¥￥]?\s*(\d+(?:\.\d+)?)/,
  ];
  for (const p of patterns) {
    const m = raw.match(p);
    if (m && m[1]) return Math.round(parseFloat(m[1]) * 100);
  }
  return undefined;
}

/** Words appearing right after a negation (不/别/不要/去掉…) become 'avoid'. */
function extractAvoid(raw: string): string[] {
  const avoid: string[] = [];
  const re = /(?:不要|不想|不吃|不加|不能|别来|别|去掉|没有|不)([一-龥]{1,3})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    if (m[1]) avoid.push(m[1]);
  }
  return avoid;
}

export function parseNaturalQuery(raw: string): NaturalQuery {
  return {
    raw,
    budget: extractBudget(raw),
    avoid: extractAvoid(raw),
  };
}

/**
 * A compact snapshot of the whole catalog's menu, safe to send to an external
 * matcher (an LLM proxy) — dish ids, names, and tags only, no pricing.
 */
export interface MenuDish {
  dishId: string;
  name: string;
  tags: string[];
}
export interface RestaurantMenu {
  restaurantId: string;
  name: string;
  distanceKm: number;
  dishes: MenuDish[];
}

/** Build the menu snapshot from whatever the first carrying provider lists. */
export async function buildMenuSnapshot(providers: PriceProvider[]): Promise<RestaurantMenu[]> {
  const menus: RestaurantMenu[] = [];
  for (const summary of await searchAll(providers, '')) {
    let listing = null;
    for (const provider of providers) {
      listing = await provider.getListing(summary.restaurantId);
      if (listing) break;
    }
    if (!listing) continue;
    menus.push({
      restaurantId: summary.restaurantId,
      name: summary.name,
      distanceKm: summary.distanceKm,
      dishes: listing.dishes.map((d) => ({ dishId: d.id, name: d.name, tags: d.tags ?? [] })),
    });
  }
  return menus;
}

/**
 * A resolved craving: which dishes matter and by how much. This is the seam
 * between "understanding language" (deterministic parser OR an LLM) and "pricing
 * the answer" (the exact engine). Both matchers emit this; `rankByPlan` consumes
 * it. `aspects` are the distinct wants a dish covers (辣/汤…) so a combo can be
 * scored by breadth of fit; when a matcher supplies none, `relevance` sums.
 */
export interface DishMatch {
  dishId: string;
  relevance: number;
  aspects: string[];
}
export interface IntentPlan {
  budget?: number;
  matches: DishMatch[];
  excludeDishIds?: string[];
}

/** One restaurant's best answer to a craving, priced across every platform. */
export interface IntentSuggestion {
  restaurantId: string;
  restaurantName: string;
  cart: Cart;
  dishes: { dishId: string; name: string }[];
  /** Fit score: distinct aspects covered, or summed relevance when no aspects. */
  matchScore: number;
  /** Cheapest cross-platform breakdown for this cart. */
  cheapest: PriceBreakdown;
  /** Fen saved vs the dearest platform for the same cart. */
  maxSaving: number;
}

export interface IntentOptions {
  maxDishes?: number;
  limit?: number;
}

/**
 * Price and rank a plan across the whole catalog: for every restaurant, find the
 * combo of matched dishes (≤ maxDishes, under budget) with the best fit, price it
 * on every platform, and rank the winners by fit then to-hand price.
 *
 * Ranking is deterministic and exact — the fuzzy step already happened upstream
 * when the plan was produced.
 */
export async function rankByPlan(
  providers: PriceProvider[],
  profile: UserProfile,
  plan: IntentPlan,
  options: IntentOptions = {},
): Promise<IntentSuggestion[]> {
  const { maxDishes = 3, limit = 8 } = options;
  const byId = new Map(plan.matches.map((m) => [m.dishId, m]));
  const excluded = new Set(plan.excludeDishIds ?? []);
  const menu = await buildMenuSnapshot(providers);
  const results: IntentSuggestion[] = [];

  for (const restaurant of menu) {
    const pool = restaurant.dishes
      .filter((d) => byId.has(d.dishId) && !excluded.has(d.dishId))
      .map((d) => ({ dish: d, match: byId.get(d.dishId)! }));
    if (pool.length === 0) continue;

    let best: IntentSuggestion | null = null;
    const walk = async (start: number, picked: { dish: MenuDish; match: DishMatch }[]) => {
      if (picked.length > 0) {
        const cart: Cart = {
          restaurantId: restaurant.restaurantId,
          lines: picked.map((p) => ({ dishId: p.dish.dishId, qty: 1 })),
        };
        const ranked = await rankPlatforms(providers, cart, profile);
        const cheapest = ranked.cheapest;
        if (cheapest && (plan.budget === undefined || cheapest.final <= plan.budget)) {
          const aspects = new Set(picked.flatMap((p) => p.match.aspects));
          const matchScore =
            aspects.size > 0 ? aspects.size : picked.reduce((s, p) => s + p.match.relevance, 0);
          const better =
            !best ||
            matchScore > best.matchScore ||
            (matchScore === best.matchScore && cheapest.final < best.cheapest.final);
          if (better) {
            best = {
              restaurantId: restaurant.restaurantId,
              restaurantName: restaurant.name,
              cart,
              dishes: picked.map((p) => ({ dishId: p.dish.dishId, name: p.dish.name })),
              matchScore,
              cheapest,
              maxSaving: ranked.maxSaving,
            };
          }
        }
      }
      if (picked.length >= maxDishes) return;
      for (let i = start; i < pool.length; i++) {
        const item = pool[i];
        if (!item) continue;
        picked.push(item);
        await walk(i + 1, picked);
        picked.pop();
      }
    };
    await walk(0, []);

    if (best) results.push(best);
  }

  results.sort((a, b) =>
    b.matchScore !== a.matchScore
      ? b.matchScore - a.matchScore
      : a.cheapest.final - b.cheapest.final,
  );
  return results.slice(0, limit);
}

/**
 * The craving-tags a dish satisfies (the ones the user's text mentions), or null
 * if the dish is ruled out by an 'avoid'.
 */
function matchedTags(dish: Pick<Dish, 'name' | 'tags'>, query: NaturalQuery): string[] | null {
  const tags = dish.tags ?? [];
  for (const bad of query.avoid) {
    if (dish.name.includes(bad) || tags.some((t) => t.includes(bad) || bad.includes(t))) {
      return null;
    }
  }
  return tags.filter((t) => query.raw.includes(t));
}

/** Turn a deterministically-parsed query into a plan against a menu snapshot. */
export function planFromNaturalQuery(query: NaturalQuery, menu: RestaurantMenu[]): IntentPlan {
  const matches: DishMatch[] = [];
  const excludeDishIds: string[] = [];
  const withTags: DishMatch[] = [];

  for (const restaurant of menu) {
    for (const dish of restaurant.dishes) {
      const tags = matchedTags(dish, query);
      if (tags === null) {
        excludeDishIds.push(dish.dishId);
        continue;
      }
      matches.push({ dishId: dish.dishId, relevance: tags.length, aspects: tags });
      if (tags.length > 0) withTags.push({ dishId: dish.dishId, relevance: tags.length, aspects: tags });
    }
  }

  // If any dish matches a want, only combine those; otherwise (pure budget query)
  // keep the whole menu so ranking falls back to price alone.
  return {
    budget: query.budget,
    matches: withTags.length > 0 ? withTags : matches,
    excludeDishIds,
  };
}

/**
 * Answer a free-text craving with the deterministic parser + exact ranker. This
 * is the offline path; the app prefers an LLM matcher and falls back to this.
 */
export async function suggestByIntent(
  providers: PriceProvider[],
  profile: UserProfile,
  query: NaturalQuery,
  options: IntentOptions = {},
): Promise<IntentSuggestion[]> {
  const menu = await buildMenuSnapshot(providers);
  const plan = planFromNaturalQuery(query, menu);
  return rankByPlan(providers, profile, plan, options);
}
