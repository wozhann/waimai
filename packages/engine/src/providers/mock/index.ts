import { yuan } from '../../money.js';
import type { PriceProvider } from '../PriceProvider.js';
import type { UserCoupon, UserProfile } from '../../types.js';
import { MockProvider } from './MockProvider.js';
import { PROFILES } from './profiles.js';

export { MockProvider } from './MockProvider.js';
export { PROFILES } from './profiles.js';
export { CATALOG } from './catalog.js';
export type { CanonicalRestaurant, CanonicalDish, DishCategory } from './catalog.js';
export type { PlatformProfile, ManjianTier } from './profiles.js';

/** The three mock platform providers, ready to hand to the engine. */
export function createMockProviders(): PriceProvider[] {
  return [
    new MockProvider(PROFILES.meituan),
    new MockProvider(PROFILES.eleme),
    new MockProvider(PROFILES.jd),
  ];
}

/** A few sample coupons a demo user might hold, one per platform. */
export const SAMPLE_COUPONS: UserCoupon[] = [
  { id: 'mt-c1', label: '美团 满40减7', platform: 'meituan', threshold: yuan(40), discount: yuan(7) },
  { id: 'elm-c1', label: '饿了么 满30减5', platform: 'eleme', threshold: yuan(30), discount: yuan(5) },
  { id: 'jd-c1', label: '京东 无门槛减4', platform: 'jd', threshold: 0, discount: yuan(4) },
];

/** A reasonable starting personalization for the app's profile screen. */
export function createDefaultProfile(): UserProfile {
  return {
    memberships: { meituan: 'none', eleme: 'member', jd: 'none' },
    coupons: [],
  };
}
