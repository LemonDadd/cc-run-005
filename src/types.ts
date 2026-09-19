// 与 Rust 后端 serde camelCase 输出对齐的数据模型。

export type GameType =
  | "counting"
  | "compare"
  | "orchard"
  | "shapes"
  | "pattern"
  | "clock";

export interface Profile {
  id: number;
  nickname: string;
  birthday: string; // YYYY-MM-DD
  avatar: string;
  levelOverride: number | null;
  starsTotal: number;
  equipped: string; // JSON: {hat?:string,glasses?:string,bg?:string,pet?:string}
  createdAt: string;
}

export interface ProfileInput {
  nickname: string;
  birthday: string;
  avatar: string;
}

export interface SafeSettings {
  dailyLimitMinutes: number;
  isDefaultPin: boolean;
}

export interface UsageStatus {
  date: string;
  usedSeconds: number;
  limitSeconds: number;
  remainingSeconds: number;
  limitReached: boolean;
}

export interface UnlockedItem {
  itemCode: string;
  unlockedAt: string;
}

export interface Achievement {
  id: number;
  profileId: number;
  code: string;
  unlockedAt: string;
}

export interface GameProgress {
  gameType: GameType;
  rounds: number;
  bestLevel: number;
  totalCorrect: number;
  totalQuestions: number;
  accuracy: number;
}

export interface ProfileStats {
  profile: Profile;
  ageYears: number;
  effectiveLevel: number;
  roundsTotal: number;
  totalCorrect: number;
  totalQuestions: number;
  accuracy: number;
  games: GameProgress[];
  achievements: Achievement[];
  itemsUnlocked: number;
}

export interface SessionResult {
  stars: number;
  accuracy: number;
  correct: number;
  total: number;
  starsTotal: number;
  newItems: UnlockedItem[];
  newAchievements: Achievement[];
}

export interface RecordGameInput {
  profileId: number;
  gameType: GameType;
  level: number;
  correct: number;
  total: number;
}

export interface LevelInfo {
  ageYears: number;
  effectiveLevel: number;
}
