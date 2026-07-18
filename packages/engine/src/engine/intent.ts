import { rankPlatforms, searchAll } from './rank.js';
import type { PriceProvider } from '../providers/PriceProvider.js';
import type { Cart, Dish, PriceBreakdown, UserProfile } from '../types.js';

/**
 * A parsed free-text craving, e.g. 「想吃辣的，但是20元以内，有点汤更好了」.
 *
 * This deterministic parser is the offline fallback: it pulls a budget out with
 * regex and treats the rest of the sentence as a bag of taste words matched by
 * substring against each dish's menu tags. It does NOT truly understand language
 * — swapping in an LLM matcher behind the same `NaturalQuery` shape is the
 * intended upgrade (it would read the same dish tags, just interpret the user's
 * words far better). See docs/README for the seam.
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
 * The craving-tags a dish satisfies (the ones the user's text mentions), or null
 * if the dish is ruled out by an 'avoid'. Returning the tag SET — not a count —
 * lets a combo be scored by how many *distinct* wants it covers, so 「辣 + 汤」
 * genuinely beats stacking two 汤 dishes.
 */
function matchedTags(dish: Dish, query: NaturalQuery): string[] | null {
  const tags = dish.tags ?? [];
  for (const bad of query.avoid) {
    if (dish.name.includes(bad) || tags.some((t) => t.includes(bad) || bad.includes(t))) {
      return null;
    }
  }
  return tags.filter((t) => query.raw.includes(t));
}

/** One restaurant's best answer to a craving, priced across every platform. */
export interface IntentSuggestion {
  restaurantId: string;
  restaurantName: string;
  cart: Cart;
  dishes: { dishId: string; name: string }[];
  /** Total taste-tag matches across the picked dishes (higher = better fit). */
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
 * Answer a free-text craving across the whole catalog: for every restaurant,
 * find the dish combo that best matches the craving while staying under budget,
 * price it on every platform, and rank the winners by fit then price.
 *
 * Ranking is deterministic and exact (the engine already prices perfectly); the
 * only fuzzy step is `scoreDish`, which is exactly where an LLM would slot in.
 */
export async function suggestByIntent(
  providers: PriceProvider[],
  profile: UserProfile,
  query: NaturalQuery,
  options: IntentOptions = {},
): Promise<IntentSuggestion[]> {
  const { maxDishes = 3, limit = 8 } = options;
  const results: IntentSuggestion[] = [];

  for (const summary of await searchAll(providers, '')) {
    let listing = null;
    for (const provider of providers) {
      listing = await provider.getListing(summary.restaurantId);
      if (listing) break;
    }
    if (!listing) continue;

    // Keep dishes not ruled out; remember which craving-tags each one covers.
    const scored = listing.dishes
      .map((d) => ({ dish: d, tags: matchedTags(d, query) }))
      .filter((x): x is { dish: Dish; tags: string[] } => x.tags !== null);

    const wantsExpressed = scored.some((x) => x.tags.length > 0);
    // Only combine dishes that actually match the craving; if nothing matches
    // (pure "cheap food under ¥20" query), fall back to the whole menu.
    const pool = wantsExpressed ? scored.filter((x) => x.tags.length > 0) : scored;
    if (pool.length === 0) continue;

    // Best subset (up to maxDishes) under budget, maximizing fit then price.
    let best: IntentSuggestion | null = null;
    const walk = async (start: number, picked: { dish: Dish; tags: string[] }[]) => {
      if (picked.length > 0) {
        const cart: Cart = {
          restaurantId: summary.restaurantId,
          lines: picked.map((p) => ({ dishId: p.dish.id, qty: 1 })),
        };
        const ranked = await rankPlatforms(providers, cart, profile);
        const cheapest = ranked.cheapest;
        if (cheapest && (query.budget === undefined || cheapest.final <= query.budget)) {
          const matchScore = new Set(picked.flatMap((p) => p.tags)).size;
          const better =
            !best ||
            matchScore > best.matchScore ||
            (matchScore === best.matchScore && cheapest.final < best.cheapest.final);
          if (better) {
            best = {
              restaurantId: summary.restaurantId,
              restaurantName: summary.name,
              cart,
              dishes: picked.map((p) => ({ dishId: p.dish.id, name: p.dish.name })),
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
