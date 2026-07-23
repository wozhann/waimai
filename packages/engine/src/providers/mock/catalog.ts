import type { Platform } from '../../types.js';

/**
 * Canonical restaurant catalog shared across platforms.
 *
 * A restaurant and its dishes have stable ids across every platform; each
 * platform then overlays its own pricing (see profiles.ts). This mirrors reality:
 * the same shop and the same dish, priced differently per app — which is exactly
 * what the comparison is about. `platforms` lists which apps carry the shop.
 */

/**
 * The section a dish belongs to, mirroring the real category rows the delivery
 * apps use on their food channel (品质正餐 / 汉堡快餐 / 饺子小吃 …). The 逛吃
 * feed groups and filters by this. `pinhaofan` is 美团's budget curated set-meal
 * format — essentially a 美团 exclusive, so those items compare on fewer apps.
 */
export type DishCategory =
  | 'pinhaofan' // 拼好饭
  | 'zhengcan' // 品质正餐
  | 'hanbao' // 汉堡快餐
  | 'mifan' // 米饭快餐
  | 'mianshi' // 面食
  | 'malatang' // 麻辣烫
  | 'jiaozi' // 饺子小吃
  | 'zhaji' // 炸鸡炸串
  | 'tianpin'; // 甜品饮品

export interface CanonicalDish {
  id: string;
  name: string;
  basePriceYuan: number;
  /** Which app-style section this dish shows under in the browse feed. */
  category: DishCategory;
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
    id: 'rest-pinhaofan',
    name: '美团拼好饭 · 一人食',
    cuisine: '拼好饭 特价套餐',
    distanceKm: 1.1,
    // 拼好饭 is a 美团 budget format; 饿了么 runs a similar 特价 channel. Not on JD.
    platforms: ['meituan', 'eleme'],
    dishes: [
      { id: 'php-huangmenji', name: '拼好饭·黄焖鸡拌饭', basePriceYuan: 10.9, category: 'pinhaofan', tags: ['米饭', '鸡肉', '荤', '实惠'] },
      { id: 'php-luroufan', name: '拼好饭·台式卤肉饭', basePriceYuan: 12.9, category: 'pinhaofan', tags: ['米饭', '猪肉', '荤', '实惠'] },
      { id: 'php-xiangguo', name: '拼好饭·麻辣香锅拌饭', basePriceYuan: 13.9, category: 'pinhaofan', tags: ['米饭', '辣', '麻辣', '荤', '实惠'] },
    ],
  },
  {
    id: 'rest-waipojia',
    name: '外婆家（杭帮菜）',
    cuisine: '品质正餐 杭帮菜 中式正餐',
    distanceKm: 2.6,
    platforms: ['meituan', 'eleme', 'jd'],
    dishes: [
      { id: 'wpj-xihu-fish', name: '西湖醋鱼', basePriceYuan: 38, category: 'zhengcan', tags: ['鱼', '正餐', '荤', '酸甜'] },
      { id: 'wpj-longjing-shrimp', name: '龙井虾仁', basePriceYuan: 45, category: 'zhengcan', tags: ['虾', '正餐', '荤', '清淡'] },
      { id: 'wpj-dongpo-pork', name: '东坡肉', basePriceYuan: 32, category: 'zhengcan', tags: ['猪肉', '正餐', '荤'] },
      { id: 'wpj-soymilk', name: '现磨豆浆', basePriceYuan: 8, category: 'tianpin', tags: ['饮料', '清淡'] },
    ],
  },
  {
    id: 'rest-kfc',
    name: '肯德基（人民广场店）',
    cuisine: '西式快餐 炸鸡 汉堡',
    distanceKm: 3.2,
    platforms: ['meituan', 'eleme', 'jd'],
    dishes: [
      { id: 'kfc-burger', name: '香辣鸡腿堡', basePriceYuan: 24, category: 'hanbao', tags: ['汉堡', '辣', '荤', '炸'] },
      { id: 'kfc-nuggets', name: '黄金鸡块（5块）', basePriceYuan: 18, category: 'zhaji', tags: ['炸鸡', '荤', '炸'] },
      { id: 'kfc-wings', name: '香辣炸鸡翅（2对）', basePriceYuan: 16, category: 'zhaji', tags: ['炸鸡', '辣', '荤', '炸'] },
      { id: 'kfc-fries', name: '薯条（大）', basePriceYuan: 12, category: 'hanbao', tags: ['薯条', '素', '炸'] },
      { id: 'kfc-cola', name: '百事可乐（中）', basePriceYuan: 9, category: 'tianpin', tags: ['饮料', '甜'] },
    ],
  },
  {
    id: 'rest-zhengxin',
    name: '正新鸡排',
    cuisine: '炸鸡炸串 小吃',
    distanceKm: 1.5,
    platforms: ['meituan', 'eleme', 'jd'],
    dishes: [
      { id: 'zx-chicken-steak', name: '招牌大鸡排', basePriceYuan: 12, category: 'zhaji', tags: ['炸鸡', '辣', '荤', '炸'] },
      { id: 'zx-chicken-strips', name: '炸鸡柳', basePriceYuan: 15, category: 'zhaji', tags: ['炸鸡', '荤', '炸'] },
      { id: 'zx-skewers', name: '骨肉相连（3串）', basePriceYuan: 13, category: 'zhaji', tags: ['烧烤', '荤', '炸'] },
    ],
  },
  {
    id: 'rest-huangmenji',
    name: '杨铭宇黄焖鸡米饭',
    cuisine: '中式快餐 黄焖鸡 米饭',
    distanceKm: 0.9,
    platforms: ['meituan', 'eleme', 'jd'],
    dishes: [
      { id: 'hmj-chicken-rice', name: '黄焖鸡米饭（标准）', basePriceYuan: 26, category: 'mifan', tags: ['米饭', '鸡肉', '荤', '汤'] },
      { id: 'hmj-spicy-rice', name: '香辣牛肉盖浇饭', basePriceYuan: 24, category: 'mifan', tags: ['米饭', '牛肉', '辣', '荤'] },
      { id: 'hmj-soup', name: '例汤', basePriceYuan: 6, category: 'mifan', tags: ['汤', '清淡'] },
    ],
  },
  {
    id: 'rest-lanzhou',
    name: '马子禄兰州牛肉面',
    cuisine: '兰州拉面 面食',
    distanceKm: 1.8,
    platforms: ['meituan', 'eleme', 'jd'],
    dishes: [
      { id: 'lz-beef-noodle', name: '招牌牛肉拉面', basePriceYuan: 22, category: 'mianshi', tags: ['面', '汤', '牛肉', '荤'] },
      { id: 'lz-fried-noodle', name: '牛肉炒面', basePriceYuan: 24, category: 'mianshi', tags: ['面', '牛肉', '荤'] },
      { id: 'lz-cold-dish', name: '凉拌小菜', basePriceYuan: 8, category: 'zhengcan', tags: ['凉菜', '清淡', '素'] },
      { id: 'lz-lamb-skewer', name: '羊肉串（5串）', basePriceYuan: 15, category: 'zhaji', tags: ['烧烤', '羊肉', '荤', '辣'] },
      { id: 'lz-cola', name: '可乐', basePriceYuan: 5, category: 'tianpin', tags: ['饮料', '甜'] },
    ],
  },
  {
    id: 'rest-malatang',
    name: '杨国福麻辣烫',
    cuisine: '麻辣烫 川味 火锅',
    distanceKm: 2.5,
    // Intentional coverage gap: JD does not carry this shop (used in tests).
    platforms: ['meituan', 'eleme'],
    dishes: [
      { id: 'mlt-standard', name: '精选麻辣烫（标准份）', basePriceYuan: 26, category: 'malatang', tags: ['辣', '麻辣', '汤', '荤'] },
      { id: 'mlt-clear', name: '番茄养生锅（标准份）', basePriceYuan: 27, category: 'malatang', tags: ['汤', '番茄', '清淡'] },
      { id: 'mlt-drink', name: '酸梅汤', basePriceYuan: 7, category: 'tianpin', tags: ['饮料', '甜'] },
    ],
  },
  {
    id: 'rest-xijiade',
    name: '喜家德虾仁水饺',
    cuisine: '饺子小吃 东北菜',
    distanceKm: 2.1,
    platforms: ['meituan', 'eleme', 'jd'],
    dishes: [
      { id: 'xjd-shrimp-dumpling', name: '虾三鲜水饺（12个）', basePriceYuan: 28, category: 'jiaozi', tags: ['饺子', '虾', '荤'] },
      { id: 'xjd-pork-dumpling', name: '玉米猪肉水饺（12个）', basePriceYuan: 22, category: 'jiaozi', tags: ['饺子', '猪肉', '荤'] },
      { id: 'xjd-guotie', name: '招牌锅贴（8个）', basePriceYuan: 16, category: 'jiaozi', tags: ['小吃', '猪肉', '荤', '煎'] },
    ],
  },
  {
    id: 'rest-shuyi',
    name: '书亦烧仙草',
    cuisine: '甜品饮品 奶茶',
    distanceKm: 1.3,
    platforms: ['meituan', 'eleme', 'jd'],
    dishes: [
      { id: 'sy-youzi', name: '满杯红柚', basePriceYuan: 16, category: 'tianpin', tags: ['饮料', '果茶', '甜'] },
      { id: 'sy-xiancao', name: '烧仙草奶茶', basePriceYuan: 14, category: 'tianpin', tags: ['奶茶', '甜'] },
      { id: 'sy-grape', name: '多肉葡萄', basePriceYuan: 18, category: 'tianpin', tags: ['饮料', '果茶', '甜'] },
    ],
  },
];
