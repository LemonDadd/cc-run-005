// 数据访问层：所有数据库操作都经过这里。
// - Tauri 桌面环境：通过 invoke 调用 Rust 端 command，前端绝不直接访问文件系统
// - 普通浏览器（npm run dev 预览）：使用 localStorage 内存库降级，逻辑与 Rust 完全一致
import { invoke } from '@tauri-apps/api/core'
import type {
  Achievement,
  DailyUsage,
  EquippedItem,
  GameRecord,
  GameType,
  ItemSlot,
  ParentSettings,
  Profile,
  ProfileStats,
  SaveRoundResult,
} from '../types'
import { browserBackend } from './browserDb'

export { browserBackend }
export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export interface RoundInput {
  profileId: number
  gameType: GameType
  level: number
  correct: number
  total: number
  durationSec: number
}

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri) return invoke<T>(cmd, args)
  return browserBackend.call<T>(cmd, args)
}

export const db = {
  listProfiles: () => call<Profile[]>('list_profiles'),

  createProfile: (nickname: string, birthday: string, avatar: string) =>
    call<Profile>('create_profile', { nickname, birthday, avatar }),

  updateProfile: (
    id: number,
    fields: { nickname?: string; birthday?: string; avatar?: string },
  ) => call<Profile>('update_profile', { id, ...fields }),

  deleteProfile: (id: number) => call<void>('delete_profile', { id }),

  /** 家长设置（不含可逆向信息，pin_hash 仅用于判断是否默认） */
  getParentSettings: () => call<ParentSettings>('get_parent_settings'),

  /** 校验 PIN，Rust 端对哈希比对 */
  verifyPin: (pin: string) => call<boolean>('verify_pin', { pin }),

  changePin: (oldPin: string, newPin: string) =>
    call<ParentSettings>('change_pin', { oldPin, newPin }),

  setDailyLimit: (pin: string, minutes: number) =>
    call<ParentSettings>('set_daily_limit', { pin, minutes }),

  /** 累加当日游玩秒数，返回今日用量 */
  addUsage: (profileId: number, seconds: number) =>
    call<DailyUsage>('add_usage', { profileId, seconds }),

  getTodayUsage: (profileId: number) =>
    call<DailyUsage | null>('get_today_usage', { profileId }),

  saveRound: (input: RoundInput) => call<SaveRoundResult>('save_round', { ...input }),

  getStats: (profileId: number) => call<ProfileStats>('get_stats', { profileId }),

  listAchievements: (profileId: number) =>
    call<Achievement[]>('list_achievements', { profileId }),

  listRecords: (profileId: number) =>
    call<GameRecord[]>('list_records', { profileId }),

  getInventory: (profileId: number) =>
    call<{ unlocked: { itemId: string; unlockedAt: string }[]; equipped: EquippedItem[] }>(
      'get_inventory',
      { profileId },
    ),

  equipItem: (profileId: number, slot: ItemSlot, itemId: string | null) =>
    call<EquippedItem[]>('equip_item', { profileId, slot, itemId }),

  /** 家长面板：重置该档案的全部游戏进度、星星、成就与饰品（保留昵称/生日/头像） */
  resetProgress: (pin: string, profileId: number) =>
    call<Profile>('reset_progress', { pin, profileId }),
}
