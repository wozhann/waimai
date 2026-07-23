/** Public API of the waimai price-comparison engine. */

export * from './types.js';
export { yuan, formatYuan } from './money.js';
export { computePrice } from './engine/computePrice.js';
export { rankPlatforms, searchAll, type RankedResult } from './engine/rank.js';
export {
  parseSmartQuery,
  smartSearch,
  type SmartQuery,
  type SmartMatch,
} from './engine/smartSearch.js';
export {
  suggestCombos,
  type ComboSuggestion,
  type SuggestOptions,
} from './engine/suggestCombos.js';
export {
  parseNaturalQuery,
  planFromNaturalQuery,
  buildMenuSnapshot,
  rankByPlan,
  suggestByIntent,
  type NaturalQuery,
  type IntentPlan,
  type DishMatch,
  type MenuDish,
  type RestaurantMenu,
  type IntentSuggestion,
  type IntentOptions,
} from './engine/intent.js';
export {
  browseDishes,
  BROWSE_CATEGORIES,
  type BrowseDish,
  type BrowseCategory,
  type BrowseOptions,
} from './engine/browse.js';
export type { PriceProvider } from './providers/PriceProvider.js';
export {
  MockProvider,
  createMockProviders,
  createDefaultProfile,
  SAMPLE_COUPONS,
  PROFILES,
  CATALOG,
  type CanonicalRestaurant,
  type CanonicalDish,
  type PlatformProfile,
  type ManjianTier,
} from './providers/mock/index.js';
