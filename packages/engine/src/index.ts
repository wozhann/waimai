/** Public API of the waimai price-comparison engine. */

export * from './types.js';
export { yuan, formatYuan } from './money.js';
export { computePrice } from './engine/computePrice.js';
export { rankPlatforms, searchAll, type RankedResult } from './engine/rank.js';
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
