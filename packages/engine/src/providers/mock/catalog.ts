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
  /**
   * Menu metadata: generic terms + taste/category descriptors the dish name
   * doesn't literally contain (香辣鸡腿堡 → 汉堡/辣, 例汤 → 汤/清淡). This is the
   * kind of structured attribute a real menu API carries; free-text intent
   * search matches a user's words against it. A future LLM matcher would read
   * the same metadata rather than replace it.
   */
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
      { id: 'lz-beef-noodle', name: '招牌牛肉拉面', basePriceYuan: 22, tags: ['面', '汤', '牛肉', '荤'] },
      { id: 'lz-cold-dish', name: '凉拌小菜', basePriceYuan: 8, tags: ['凉菜', '清淡', '素'] },
      { id: 'lz-lamb-skewer', name: '羊肉串（5串）', basePriceYuan: 15, tags: ['烧烤', '羊肉', '荤', '辣'] },
      { id: 'lz-cola', name: '可乐', basePriceYuan: 5, tags: ['饮料', '甜'] },
    ],
  },
  {
    id: 'rest-kfc',
    name: '肯德基（人民广场店）',
    cuisine: '西式快餐 炸鸡 汉堡',
    distanceKm: 3.2,
    platforms: ['meituan', 'eleme', 'jd'],
    dishes: [
      { id: 'kfc-burger', name: '香辣鸡腿堡', basePriceYuan: 24, tags: ['汉堡', '辣', '荤', '炸'] },
      { id: 'kfc-nuggets', name: '黄金鸡块（5块）', basePriceYuan: 18, tags: ['炸鸡', '荤', '炸'] },
      { id: 'kfc-wings', name: '香辣炸鸡翅（2对）', basePriceYuan: 16, tags: ['炸鸡', '辣', '荤', '炸'] },
      { id: 'kfc-fries', name: '薯条（大）', basePriceYuan: 12, tags: ['薯条', '素', '炸'] },
      { id: 'kfc-cola', name: '百事可乐（中）', basePriceYuan: 9, tags: ['饮料', '甜'] },
    ],
  },
  {
    id: 'rest-huangmenji',
    name: '杨铭宇黄焖鸡米饭',
    cuisine: '中式快餐 黄焖鸡 米饭',
    distanceKm: 0.9,
    platforms: ['meituan', 'eleme', 'jd'],
    dishes: [
      { id: 'hmj-chicken-rice', name: '黄焖鸡米饭（标准）', basePriceYuan: 26, tags: ['米饭', '鸡肉', '荤', '汤'] },
      { id: 'hmj-rice', name: '加饭', basePriceYuan: 2, tags: ['米饭', '主食', '素'] },
      { id: 'hmj-soup', name: '例汤', basePriceYuan: 6, tags: ['汤', '清淡'] },
      { id: 'hmj-egg', name: '荷包蛋', basePriceYuan: 3, tags: ['蛋', '荤'] },
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
      { id: 'mlt-standard', name: '精选麻辣烫（标准份）', basePriceYuan: 26, tags: ['辣', '麻辣', '汤', '荤'] },
      { id: 'mlt-sesame', name: '麻酱小料', basePriceYuan: 3, tags: ['调料'] },
      { id: 'mlt-drink', name: '酸梅汤', basePriceYuan: 7, tags: ['饮料', '甜'] },
    ],
  },
];
