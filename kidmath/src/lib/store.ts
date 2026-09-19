// 全局应用状态（Zustand）：当前儿童档案、家长设置、当日时长、奖励结算数据。
// 所有数据都按档案隔离；切换玩家时清空关联缓存。
import { create } from 'zustand'
import { DEFAULT_DAILY_LIMIT_MIN } from '../constants/games'
import { setProfileLevelOverride } from './db-extra'
import { db } from './db'
import type {
  Achievement,
  GameRecord,
  ParentSettings,
  Profile,
  SaveRoundResult,
} from '../types'

export interface RewardData {
  result: SaveRoundResult
  total: number
  correct: number
  gameName: string
}

interface AppState {
  profiles: Profile[]
  current: Profile | null
  settings: ParentSettings | null
  todayUsedSec: number
  reward: RewardData | null
  busy: boolean

  bootstrap: () => Promise<void>
  refreshProfiles: () => Promise<void>
  selectProfile: (p: Profile) => Promise<void>
  createProfile: (nickname: string, birthday: string, avatar: string) => Promise<Profile>
  updateCurrentProfile: (patch: Partial<Pick<Profile, 'nickname' | 'birthday' | 'avatar'>>) => Promise<void>
  setLevelOverride: (pin: string, profileId: number, level: number | null) => Promise<void>
  removeProfile: (id: number) => Promise<void>
  refreshSettings: () => Promise<void>
  recordUsage: (seconds: number) => Promise<number>
  finishRound: (r: RewardData) => void
  clearReward: () => void
  syncCurrentFromDb: () => Promise<void>
  listRecords: () => Promise<GameRecord[]>
  listAchievements: () => Promise<Achievement[]>
}

export const useApp = create<AppState>((set, get) => ({
  profiles: [],
  current: null,
  settings: null,
  todayUsedSec: 0,
  reward: null,
  busy: false,

  bootstrap: async () => {
    const [profiles, settings] = await Promise.all([
      db.listProfiles(),
      db.getParentSettings().catch(() => null),
    ])
    set({
      profiles,
      settings: settings ?? {
        pin_hash: '',
        pin_salt: '',
        pin_is_default: true,
        daily_limit_min: DEFAULT_DAILY_LIMIT_MIN,
      },
    })
  },

  refreshProfiles: async () => {
    const profiles = await db.listProfiles()
    const cur = get().current
    set({
      profiles,
      current: cur ? profiles.find((p) => p.id === cur.id) ?? null : null,
    })
  },

  selectProfile: async (p) => {
    const usage = await db.getTodayUsage(p.id)
    set({ current: p, todayUsedSec: usage?.used_sec ?? 0, reward: null })
  },

  createProfile: async (nickname, birthday, avatar) => {
    const p = await db.createProfile(nickname, birthday, avatar)
    await get().refreshProfiles()
    await get().selectProfile(p)
    return p
  },

  updateCurrentProfile: async (patch) => {
    const cur = get().current
    if (!cur) return
    const updated = await db.updateProfile(cur.id, patch)
    set({ current: updated })
    await get().refreshProfiles()
  },

  setLevelOverride: async (pin, profileId, level) => {
    // 家长操作：Rust 端会校验 PIN 哈希
    const updated = await setProfileLevelOverride(pin, profileId, level)
    set((s) => ({
      profiles: s.profiles.map((p) => (p.id === profileId ? updated : p)),
      current: s.current?.id === profileId ? updated : s.current,
    }))
  },

  removeProfile: async (id) => {
    await db.deleteProfile(id)
    if (get().current?.id === id) set({ current: null, todayUsedSec: 0 })
    await get().refreshProfiles()
  },

  refreshSettings: async () => {
    const settings = await db.getParentSettings()
    set({ settings })
  },

  recordUsage: async (seconds) => {
    const cur = get().current
    if (!cur || seconds <= 0) return get().todayUsedSec
    const row = await db.addUsage(cur.id, seconds)
    set({ todayUsedSec: row.used_sec })
    return row.used_sec
  },

  finishRound: (r) => {
    const cur = get().current
    if (cur) {
      set({
        current: { ...cur, stars_total: r.result.stars_total },
        todayUsedSec: get().todayUsedSec,
        reward: r,
      })
    } else {
      set({ reward: r })
    }
  },

  clearReward: () => set({ reward: null }),

  syncCurrentFromDb: async () => {
    const cur = get().current
    if (!cur) return
    const stats = await db.getStats(cur.id)
    set({ current: stats.profile })
    await get().refreshProfiles()
  },

  listRecords: async () => {
    const cur = get().current
    return cur ? db.listRecords(cur.id) : []
  },

  listAchievements: async () => {
    const cur = get().current
    return cur ? db.listAchievements(cur.id) : []
  },
}))
