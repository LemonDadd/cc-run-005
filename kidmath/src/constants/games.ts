import type { GameType, ItemSlot } from '../types'

/** 六种游戏的元信息（标题、配色、图标用 emoji + SVG 着色） */
export const GAMES: {
  type: GameType
  name: string
  subtitle: string
  emoji: string
  color: string
  howTo: string
}[] = [
  {
    type: 'counting',
    name: '数数捕鱼',
    subtitle: '数一数游来的小鱼',
    emoji: '🐟',
    color: '#2ea8e6',
    howTo: '点击游过的小鱼数一数，再选出总数！',
  },
  {
    type: 'compare',
    name: '比较大小',
    subtitle: '哪边更多呢',
    emoji: '🍎',
    color: '#f58634',
    howTo: '看看左右两边，点一点更多的那一边！',
  },
  {
    type: 'arithmetic',
    name: '加减法果园',
    subtitle: '果园里的加减法',
    emoji: '🍐',
    color: '#7ac142',
    howTo: '听一听果园里的小故事，算出果子有几个！',
  },
  {
    type: 'shapes',
    name: '图形配对',
    subtitle: '把图形送回家',
    emoji: '🔷',
    color: '#8b6fd6',
    howTo: '拖住图形，把它送到形状一样的家里！',
  },
  {
    type: 'patterns',
    name: '规律排序',
    subtitle: '下一个是什么',
    emoji: '⭐',
    color: '#e8568f',
    howTo: '看看排列的规律，把下一个图案拖进去！',
  },
  {
    type: 'clock',
    name: '认时钟',
    subtitle: '现在几点啦',
    emoji: '🕐',
    color: '#d9a51e',
    howTo: '看看钟面上的时针和分针，选出正确时间！',
  },
]

export const GAME_MAP = Object.fromEntries(GAMES.map((g) => [g.type, g])) as Record<
  GameType,
  (typeof GAMES)[number]
>

/** 第一版明确不做的内容，首页“即将推出”展示 */
export const COMING_SOON = [
  { name: '乘除法冒险', emoji: '✖️' },
  { name: '分数小厨房', emoji: '🥧' },
  { name: '认识钱币', emoji: '🪙' },
  { name: '数字数独', emoji: '🔢' },
]

/** 可选卡通头像（纯 SVG 绘制，离线打包） */
export const AVATARS = ['cat', 'bear', 'rabbit', 'fox', 'panda', 'owl', 'frog', 'duck'] as const
export type AvatarId = (typeof AVATARS)[number]

/** 饰品目录：每累计 5 颗星解锁下一个，按顺序发放 */
export interface ItemDef {
  id: string
  slot: ItemSlot
  name: string
  emoji: string
}

export const ITEM_CATALOG: ItemDef[] = [
  { id: 'hat_party', slot: 'hat', name: '派对小帽', emoji: '🎩' },
  { id: 'glasses_star', slot: 'glasses', name: '星星眼镜', emoji: '🕶️' },
  { id: 'bg_sky', slot: 'background', name: '蓝天背景', emoji: '🌤️' },
  { id: 'pet_dog', slot: 'pet', name: '小狗伙伴', emoji: '🐶' },
  { id: 'hat_crown', slot: 'hat', name: '金色皇冠', emoji: '👑' },
  { id: 'glasses_round', slot: 'glasses', name: '圆圆眼镜', emoji: '👓' },
  { id: 'bg_rainbow', slot: 'background', name: '彩虹背景', emoji: '🌈' },
  { id: 'pet_cat', slot: 'pet', name: '小猫伙伴', emoji: '🐱' },
  { id: 'hat_cap', slot: 'hat', name: '运动球帽', emoji: '🧢' },
  { id: 'bg_space', slot: 'background', name: '星空背景', emoji: '🌌' },
  { id: 'pet_dino', slot: 'pet', name: '恐龙伙伴', emoji: '🦕' },
  { id: 'glasses_sun', slot: 'glasses', name: '太阳墨镜', emoji: '🥽' },
]

/** 每多少颗星解锁一个饰品 */
export const STARS_PER_ITEM = 5

export function itemsForUnlockedCount(count: number): ItemDef[] {
  return ITEM_CATALOG.slice(0, Math.min(count, ITEM_CATALOG.length))
}

/** 成就定义 */
export interface AchievementDef {
  code: string
  name: string
  desc: string
  emoji: string
  kind: 'persist' | 'master' | 'explore'
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // 坚持类
  { code: 'first_round', name: '初次尝试', desc: '完成第一个游戏回合', emoji: '🌱', kind: 'persist' },
  { code: 'rounds_10', name: '坚持不懈', desc: '累计完成 10 个回合', emoji: '💪', kind: 'persist' },
  { code: 'streak_3_days', name: '连续三天', desc: '连续 3 天都来玩', emoji: '📅', kind: 'persist' },
  // 精通类
  { code: 'perfect_round', name: '满分达人', desc: '任意游戏获得 100% 正确率', emoji: '🎯', kind: 'master' },
  { code: 'correct_50', name: '答题小能手', desc: '累计答对 50 道题', emoji: '🧠', kind: 'master' },
  // 探索类
  { code: 'play_all_six', name: '小小探索家', desc: '六种游戏都玩过', emoji: '🗺️', kind: 'explore' },
  { code: 'unlock_5_items', name: '收藏家', desc: '解锁 5 个饰品', emoji: '🎁', kind: 'explore' },
]

export const ACHIEVEMENT_MAP = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.code, a]))

/** 每轮题数：随等级 5 → 10 题 */
export function questionCount(level: number): number {
  return Math.min(5 + level, 10)
}

/** 家长设置范围 */
export const DAILY_LIMIT_MIN = 10
export const DAILY_LIMIT_MAX = 60
export const DEFAULT_DAILY_LIMIT_MIN = 25
