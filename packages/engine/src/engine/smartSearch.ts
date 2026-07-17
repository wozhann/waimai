import { searchAll } from './rank.js';
import type { PriceProvider } from '../providers/PriceProvider.js';
import type { Cart, RestaurantSummary } from '../types.js';

/**
 * 智能点单 query: dish keywords the user wants (要) and refuses (不要).
 * Parsed from natural input like 「要汉堡 不要可乐 要炸鸡翅」.
 */
export interface SmartQuery {
  include: string[];
  exclude: string[];
}

/**
 * Parse a 要/不要 query. Returns null when the input contains no 要/不要
 * markers at all — callers should fall back to plain restaurant search.
 *
 * Rules: text after 要 is a wanted term, after 不要 a refused term, up to the
 * next marker. Spaces between markers are optional (「要汉堡不要可乐」works).
 * Leading text before the first marker counts as a wanted term. Terms inside
 * one segment can be separated by spaces or 、/，.
 */
export function parseSmartQuery(raw: string): SmartQuery | null {
  const markerRe = /不要|要/g; // 不要 first, so it never parses as 不 + 要-marker
  const markers: { kind: 'include' | 'exclude'; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = markerRe.exec(raw))) {
    markers.push({
      kind: m[0] === '不要' ? 'exclude' : 'include',
      start: m.index,
      end: m.index + m[0].length,
    });
  }
  if (markers.length === 0) return null;

  const include: string[] = [];
  const exclude: string[] = [];
  const pushTerms = (segment: string, into: string[]) => {
    for (const term of segment.split(/[\s,，、]+/)) {
      if (term) into.push(term);
    }
  };

  const first = markers[0];
  if (first) pushTerms(raw.slice(0, first.start), include);
  markers.forEach((marker, i) => {
    const next = markers[i + 1];
    const segment = raw.slice(marker.end, next ? next.start : raw.length);
    pushTerms(segment, marker.kind === 'include' ? include : exclude);
  });

  return { include, exclude };
}

/** A restaurant that can satisfy a SmartQuery, with the cart pre-built. */
export interface SmartMatch {
  restaurant: RestaurantSummary;
  /** One of each wanted dish, ready to hand to rankPlatforms. */
  cart: Cart;
  pickedDishes: { dishId: string; name: string }[];
}

/**
 * Find restaurants whose menu covers every 要 term (ignoring dishes that hit a
 * 不要 term) and auto-build a one-of-each cart per match. Dish names are shared
 * across platforms (only prices differ), so matching against any one carrying
 * provider's listing is enough.
 */
export async function smartSearch(
  providers: PriceProvider[],
  query: SmartQuery,
): Promise<SmartMatch[]> {
  if (query.include.length === 0) return [];

  const matches: SmartMatch[] = [];
  for (const restaurant of await searchAll(providers, '')) {
    let listing = null;
    for (const provider of providers) {
      listing = await provider.getListing(restaurant.restaurantId);
      if (listing) break;
    }
    if (!listing) continue;

    const hits = (dish: { name: string; tags?: string[] }, term: string) =>
      dish.name.includes(term) || (dish.tags?.some((t) => t.includes(term)) ?? false);

    const candidates = listing.dishes.filter(
      (d) => !query.exclude.some((term) => hits(d, term)),
    );
    const picked = new Map<string, string>(); // dishId -> name, deduped
    let coversAll = true;
    for (const term of query.include) {
      const dish = candidates.find((d) => hits(d, term));
      if (!dish) {
        coversAll = false;
        break;
      }
      picked.set(dish.id, dish.name);
    }
    if (!coversAll) continue;

    matches.push({
      restaurant,
      cart: {
        restaurantId: restaurant.restaurantId,
        lines: [...picked.keys()].map((dishId) => ({ dishId, qty: 1 })),
      },
      pickedDishes: [...picked].map(([dishId, name]) => ({ dishId, name })),
    });
  }

  matches.sort((a, b) => a.restaurant.distanceKm - b.restaurant.distanceKm);
  return matches;
}
