import type { GameType } from "../types";

// 与 Rust src-tauri/core/src/constants.rs 保持一致的纯规则。

export const GAME_TYPES: GameType[] = [
  "counting",
  "compare",
  "orchard",
  "shapes",
  "pattern",
  "clock",
];

export interface GameMeta {
  type: GameType;
  name: string;
  emoji: string;
  /** 主题渐变色（CSS） */
  gradient: string;
  description: string;
}

export const GAMES: Record<GameType, GameMeta> = {
  counting: {
    type: "counting",
    name: "数数捕鱼",
    emoji: "🐟",
    gradient: "linear-gradient(135deg,#48c6ef,#6f86d6)",
    description: "数一数海里有几条鱼",
  },
  compare: {
    type: "compare",
    name: "比较大小",
    emoji: "⚖️",
    gradient: "linear-gradient(135deg,#f6d365,#fda085)",
    description: "点一点哪边更多",
  },
  orchard: {
    type: "orchard",
    name: "加减法果园",
    emoji: "🍎",
    gradient: "linear-gradient(135deg,#84fab0,#8fd3f4)",
    description: "果园里的加减法",
  },
  shapes: {
    type: "shapes",
    name: "图形配对",
    emoji: "🔷",
    gradient: "linear-gradient(135deg,#a18cd1,#fbc2eb)",
    description: "把图形送回自己的家",
  },
  pattern: {
    type: "pattern",
    name: "规律排序",
    emoji: "🔁",
    gradient: "linear-gradient(135deg,#fccb90,#d57eeb)",
    description: "按规律补全序列",
  },
  clock: {
    type: "clock",
    name: "认时钟",
    emoji: "🕐",
    gradient: "linear-gradient(135deg,#5ee7df,#b490ca)",
    description: "认识整点和半点",
  },
};

export interface ItemDef {
  code: string;
  name: string;
  slot: "hat" | "glasses" | "bg" | "pet";
  atStars: number;
  emoji: string;
}

// 与 Rust ITEMS 一一对应（含展示用 emoji）。
export const ITEMS: ItemDef[] = [
  { code: "hat_party", name: "派对帽", slot: "hat", atStars: 5, emoji: "🎩" },
  { code: "glasses_star", name: "星星眼镜", slot: "glasses", atStars: 10, emoji: "🤩" },
  { code: "bg_meadow", name: "青青草地", slot: "bg", atStars: 15, emoji: "🌱" },
  { code: "pet_bunny", name: "小兔子", slot: "pet", atStars: 20, emoji: "🐰" },
  { code: "hat_crown", name: "小皇冠", slot: "hat", atStars: 25, emoji: "👑" },
  { code: "glasses_sun", name: "太阳眼镜", slot: "glasses", atStars: 30, emoji: "🕶️" },
  { code: "bg_night", name: "星空夜幕", slot: "bg", atStars: 35, emoji: "🌃" },
  { code: "pet_cat", name: "小猫咪", slot: "pet", atStars: 40, emoji: "🐱" },
  { code: "hat_cap", name: "棒球帽", slot: "hat", atStars: 45, emoji: "🧢" },
  { code: "glasses_round", name: "圆圆眼镜", slot: "glasses", atStars: 50, emoji: "👓" },
  { code: "bg_beach", name: "阳光沙滩", slot: "bg", atStars: 55, emoji: "🏖️" },
  { code: "pet_dog", name: "小狗狗", slot: "pet", atStars: 60, emoji: "🐶" },
  { code: "hat_wizard", name: "魔法帽", slot: "hat", atStars: 65, emoji: "🧙" },
  { code: "glasses_shield", name: "潜水镜", slot: "glasses", atStars: 70, emoji: "🤿" },
  { code: "bg_rainbow", name: "彩虹花园", slot: "bg", atStars: 75, emoji: "🌈" },
  { code: "pet_dragon", name: "小恐龙", slot: "pet", atStars: 80, emoji: "🦕" },
];

export const ITEM_BY_CODE: Record<string, ItemDef> = Object.fromEntries(
  ITEMS.map((i) => [i.code, i])
);

export const SLOT_NAMES: Record<ItemDef["slot"], string> = {
  hat: "帽子",
  glasses: "眼镜",
  bg: "背景",
  pet: "伙伴",
};

export interface AchievementDef {
  code: string;
  name: string;
  category: "persistence" | "mastery" | "exploration";
  desc: string;
  emoji: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { code: "first_round", name: "初次冒险", category: "persistence", desc: "完成第一回合游戏", emoji: "🎈" },
  { code: "rounds_10", name: "坚持不懈", category: "persistence", desc: "累计完成 10 个回合", emoji: "💪" },
  { code: "streak_3_days", name: "连续三天", category: "persistence", desc: "连续 3 天玩 KidMath", emoji: "📅" },
  { code: "perfect_game", name: "完美一局", category: "mastery", desc: "某游戏一回合 100% 正确", emoji: "🌟" },
  { code: "correct_50", name: "答题小能手", category: "mastery", desc: "累计答对 50 题", emoji: "🧠" },
  { code: "explore_all", name: "小小探险家", category: "exploration", desc: "玩遍六种游戏", emoji: "🧭" },
  { code: "items_5", name: "收藏家", category: "exploration", desc: "解锁 5 个饰品", emoji: "💎" },
  { code: "stars_30", name: "闪耀明星", category: "mastery", desc: "累计获得 30 颗星", emoji: "⭐" },
  { code: "rounds_25", name: "游戏达人", category: "persistence", desc: "累计完成 25 个回合", emoji: "🏆" },
];

export const ACHIEVEMENT_BY_CODE: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.code, a])
);

export const AVATARS = ["cat", "dog", "rabbit", "fox", "bear", "panda", "frog", "lion"] as const;
export type AvatarId = (typeof AVATARS)[number];

export const AVATAR_EMOJI: Record<string, string> = {
  cat: "🐱",
  dog: "🐶",
  rabbit: "🐰",
  fox: "🦊",
  bear: "🐻",
  panda: "🐼",
  frog: "🐸",
  lion: "🦁",
};

// “即将推出”内容（第一版明确不做）。
export const COMING_SOON = [
  { name: "乘法除法", emoji: "✖️" },
  { name: "认识分数", emoji: "½" },
  { name: "认识货币", emoji: "🪙" },
  { name: "数字数独", emoji: "🔢" },
];

export const DEFAULT_PIN = "0000";
export const DAILY_LIMIT_DEFAULT = 25;
export const DAILY_LIMIT_MIN = 10;
export const DAILY_LIMIT_MAX = 60;

export function ageFromBirthday(birthday: string, today = new Date()): number {
  const b = new Date(birthday + "T00:00:00");
  if (isNaN(b.getTime())) return 0;
  let age = today.getFullYear() - b.getFullYear();
  const beforeBirthday =
    today.getMonth() < b.getMonth() ||
    (today.getMonth() === b.getMonth() && today.getDate() < b.getDate());
  if (beforeBirthday) age -= 1;
  return Math.max(0, age);
}

export function defaultLevel(ageYears: number): number {
  return Math.min(5, Math.max(1, ageYears - 2));
}

export function effectiveLevel(
  override: number | null | undefined,
  ageYears: number
): number {
  if (override != null && override >= 1 && override <= 5) return override;
  return defaultLevel(Math.max(3, ageYears));
}

/** 每回合题目数 5-10，随等级增长。 */
export function questionCountForLevel(level: number): number {
  return Math.min(10, Math.max(5, 4 + level + 1));
}

/** 答对反馈星级：>=80% 1 星，100% 2 星。 */
export function starsForAccuracy(accuracy: number): number {
  if (accuracy >= 1 - 1e-9) return 2;
  if (accuracy >= 0.8 - 1e-9) return 1;
  return 0;
}
