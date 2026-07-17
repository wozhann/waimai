import type { Platform } from '../../types.js';

/**
 * Canonical restaurant catalog shared across platforms.
 *
 * A restaurant and its dishes have stable ids across every platform; each
 * platform then overlays its own pricing (see profiles.ts). This mirrors reality:
 * the same shop and the same dish, priced differently per app — which is exactly
 * what the comparison is about. `platforms` lists which apps carry the shop.
 */
export interface CanonicalDish {
  id: string;
  name: string;
  basePriceYuan: number;
  /** Search keywords for generic terms the name doesn't contain. */
  tags?: string[];
}

export interface CanonicalRestaurant {
  id: string;
  name: string;
  cuisine: string;
  distanceKm: number;
  platforms: Platform[];
  dishes: CanonicalDish[];
}

export const CATALOG: CanonicalRestaurant[] = [
  {
    id: 'rest-lanzhou',
    name: '马子禄兰州牛肉面',
    cuisine: '兰州拉面 面食',
    distanceKm: 1.8,
    platforms: ['meituan', 'eleme', 'jd'],
    dishes: [
      { id: 'lz-beef-noodle', name: '招牌牛肉拉面', basePriceYuan: 22 },
      { id: 'lz-cold-dish', name: '凉拌小菜', basePriceYuan: 8 },
      { id: 'lz-lamb-skewer', name: '羊肉串（5串）', basePriceYuan: 15 },
      { id: 'lz-cola', name: '可乐', basePriceYuan: 5, tags: ['饮料'] },
    ],
  },
  {
    id: 'rest-kfc',
    name: '肯德基（人民广场店）',
    cuisine: '西式快餐 炸鸡 汉堡',
    distanceKm: 3.2,
    platforms: ['meituan', 'eleme', 'jd'],
    dishes: [
      { id: 'kfc-burger', name: '香辣鸡腿堡', basePriceYuan: 24, tags: ['汉堡'] },
      { id: 'kfc-nuggets', name: '黄金鸡块（5块）', basePriceYuan: 18 },
      { id: 'kfc-wings', name: '香辣炸鸡翅（2对）', basePriceYuan: 16 },
      { id: 'kfc-fries', name: '薯条（大）', basePriceYuan: 12 },
      { id: 'kfc-cola', name: '百事可乐（中）', basePriceYuan: 9, tags: ['饮料'] },
    ],
  },
  {
    id: 'rest-huangmenji',
    name: '杨铭宇黄焖鸡米饭',
    cuisine: '中式快餐 黄焖鸡 米饭',
    distanceKm: 0.9,
    platforms: ['meituan', 'eleme', 'jd'],
    dishes: [
      { id: 'hmj-chicken-rice', name: '黄焖鸡米饭（标准）', basePriceYuan: 26 },
      { id: 'hmj-rice', name: '加饭', basePriceYuan: 2 },
      { id: 'hmj-soup', name: '例汤', basePriceYuan: 6 },
      { id: 'hmj-egg', name: '荷包蛋', basePriceYuan: 3 },
    ],
  },
  {
    id: 'rest-malatang',
    name: '杨国福麻辣烫',
    cuisine: '麻辣烫 川味 火锅',
    distanceKm: 2.5,
    // Not carried by JD — demonstrates the search merge across platforms.
    platforms: ['meituan', 'eleme'],
    dishes: [
      { id: 'mlt-standard', name: '精选麻辣烫（标准份）', basePriceYuan: 28 },
      { id: 'mlt-sesame', name: '麻酱小料', basePriceYuan: 3 },
      { id: 'mlt-drink', name: '酸梅汤', basePriceYuan: 7, tags: ['饮料'] },
    ],
  },
];
