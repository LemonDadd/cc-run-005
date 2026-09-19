// 全局类型定义：与 Rust 端 Tauri command 返回的结构保持一致

export type GameType =
  | 'counting' // 数数捕鱼
  | 'compare' // 比较大小
  | 'arithmetic' // 加减法果园
  | 'shapes' // 图形配对
  | 'patterns' // 规律排序
  | 'clock' // 认时钟

export type ItemSlot = 'hat' | 'glasses' | 'background' | 'pet'

export interface Profile {
  id: number
  nickname: string
  birthday: string // YYYY-MM-DD
  avatar: string // 头像标识，见 constants/avatars
  level_override: number | null // 家长手动覆盖的难度（1-5），null 表示按年龄自动
  stars_total: number
  created_at: string
}

export interface GameRecord {
  id: number
  profile_id: number
  game_type: GameType
  level: number
  correct: number // 一次答对的题数（计入正确率）
  total: number // 本轮总题数
  accuracy: number // 0-1
  stars_earned: number
  duration_sec: number
  played_at: string
}

export interface Achievement {
  code: string
  profile_id: number
  unlocked_at: string
}

export interface ParentSettings {
  pin_hash: string
  pin_salt: string
  pin_is_default: boolean // 是否仍为默认 0000，用于提示修改
  daily_limit_min: number // 每日游玩时长（分钟），默认 25，范围 10-60
}

export interface DailyUsage {
  profile_id: number
  day: string // YYYY-MM-DD（本地日期）
  used_sec: number
}

export interface UnlockedItem {
  profile_id: number
  item_id: string
  unlocked_at: string
}

export interface EquippedItem {
  profile_id: number
  slot: ItemSlot
  item_id: string | null
}

/** 家长面板中每个游戏的聚合统计 */
export interface GameStat {
  game_type: GameType
  rounds: number
  total_correct: number
  total_questions: number
  best_accuracy: number
  best_level: number
  last_played_at: string | null
}

export interface ProfileStats {
  profile: Profile
  games: GameStat[]
  unlocked_count: number
  equipped: Record<ItemSlot, string | null>
  today_used_sec: number
  achievements: Achievement[]
}

/** 一轮结束后 save_round 命令的返回值 */
export interface SaveRoundResult {
  record: GameRecord
  stars_earned: number
  stars_total: number
  new_achievements: Achievement[]
  newly_unlocked_items: string[] // 本轮星星触发解锁的饰品 id
}
