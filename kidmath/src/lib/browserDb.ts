// 浏览器预览降级后端：localStorage 实现，规则与 Rust src-tauri 完全一致。
// 仅用于 `npm run dev` 在浏览器中预览；桌面端所有数据落在 SQLite。
import {
  ACHIEVEMENTS,
  ITEM_CATALOG,
  STARS_PER_ITEM,
} from '../constants/games'
import type {
  Achievement,
  DailyUsage,
  EquippedItem,
  GameRecord,
  GameStat,
  GameType,
  ItemSlot,
  ParentSettings,
  Profile,
  ProfileStats,
  SaveRoundResult,
} from '../types'
import { consecutiveDays, todayStr } from '../utils/date'

const KEY = 'kidmath.v1'

const VALID_GAMES = ['counting', 'compare', 'arithmetic', 'shapes', 'patterns', 'clock'] as const

interface DB {
  profiles: Profile[]
  records: GameRecord[]
  achievements: Achievement[]
  usage: DailyUsage[]
  items: { profile_id: number; item_id: string; unlocked_at: string }[]
  equip: EquippedItem[]
  settings: ParentSettings
  seq: number
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function randomSalt(): string {
  const a = new Uint8Array(16)
  crypto.getRandomValues(a)
  return Array.from(a)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function defaultSettings(): Promise<ParentSettings> {
  const salt = randomSalt()
  return {
    pin_salt: salt,
    pin_hash: await sha256(salt + '0000'),
    pin_is_default: true,
    daily_limit_min: 25,
  }
}

function load(): DB | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as DB) : null
  } catch {
    return null
  }
}

function save(db: DB) {
  localStorage.setItem(KEY, JSON.stringify(db))
}

let dbPromise: Promise<DB> | null = null
async function getDb(): Promise<DB> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const existing = load()
      if (existing) return existing
      const fresh: DB = {
        profiles: [],
        records: [],
        achievements: [],
        usage: [],
        items: [],
        equip: [],
        settings: await defaultSettings(),
        seq: 1,
      }
      save(fresh)
      return fresh
    })()
  }
  return dbPromise
}

function nowIso() {
  return new Date().toISOString()
}

function assertPin(settings: ParentSettings, pin: string, hash: string) {
  if (settings.pin_hash !== hash) throw new Error('PIN 不正确')
}

function grantAchievements(db: DB, profileId: number): Achievement[] {
  const records = db.records.filter((r) => r.profile_id === profileId)
  const rounds = records.length
  const totalCorrect = records.reduce((s, r) => s + r.correct, 0)
  const types = new Set(records.map((r) => r.game_type))
  const days = new Set<string>([
    ...db.usage.filter((u) => u.profile_id === profileId).map((u) => u.day),
    ...records.map((r) => r.played_at.slice(0, 10)),
  ])
  const unlockedCount = db.items.filter((i) => i.profile_id === profileId).length

  const want = new Set<string>()
  if (rounds >= 1) want.add('first_round')
  if (rounds >= 10) want.add('rounds_10')
  if (consecutiveDays([...days]) >= 3) want.add('streak_3_days')
  if (records.some((r) => r.accuracy >= 1)) want.add('perfect_round')
  if (totalCorrect >= 50) want.add('correct_50')
  if (types.size >= 6) want.add('play_all_six')
  if (unlockedCount >= 5) want.add('unlock_5_items')

  const have = new Set(
    db.achievements.filter((a) => a.profile_id === profileId).map((a) => a.code),
  )
  const created: Achievement[] = []
  for (const code of ACHIEVEMENTS.map((a) => a.code)) {
    if (want.has(code) && !have.has(code)) {
      const a: Achievement = { profile_id: profileId, code, unlocked_at: nowIso() }
      db.achievements.push(a)
      created.push(a)
    }
  }
  return created
}

function grantItems(db: DB, profileId: number): string[] {
  const profile = db.profiles.find((p) => p.id === profileId)
  if (!profile) return []
  const target = Math.min(
    ITEM_CATALOG.length,
    Math.floor(profile.stars_total / STARS_PER_ITEM),
  )
  const owned = new Set(
    db.items.filter((i) => i.profile_id === profileId).map((i) => i.item_id),
  )
  const created: string[] = []
  for (let i = 0; i < target; i++) {
    const id = ITEM_CATALOG[i].id
    if (!owned.has(id)) {
      db.items.push({ profile_id: profileId, item_id: id, unlocked_at: nowIso() })
      created.push(id)
    }
  }
  return created
}

function aggregateStats(db: DB, profileId: number): GameStat[] {
  const map = new Map<GameType, GameStat>()
  for (const r of db.records.filter((x) => x.profile_id === profileId)) {
    const cur =
      map.get(r.game_type) ??
      ({
        game_type: r.game_type,
        rounds: 0,
        total_correct: 0,
        total_questions: 0,
        best_accuracy: 0,
        best_level: 0,
        last_played_at: null,
      } as GameStat)
    cur.rounds += 1
    cur.total_correct += r.correct
    cur.total_questions += r.total
    cur.best_accuracy = Math.max(cur.best_accuracy, r.accuracy)
    cur.best_level = Math.max(cur.best_level, r.level)
    if (!cur.last_played_at || r.played_at > cur.last_played_at)
      cur.last_played_at = r.played_at
    map.set(r.game_type, cur)
  }
  return [...map.values()]
}

export const browserBackend = {
  async call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    const db = await getDb()
    const a = args ?? {}

    switch (cmd) {
      case 'list_profiles':
        return db.profiles.slice() as T

      case 'create_profile': {
        const p: Profile = {
          id: db.seq++,
          nickname: String(a.nickname),
          birthday: String(a.birthday),
          avatar: String(a.avatar),
          level_override: null,
          stars_total: 0,
          created_at: nowIso(),
        }
        db.profiles.push(p)
        save(db)
        return p as T
      }

      case 'update_profile': {
        const p = db.profiles.find((x) => x.id === a.id)
        if (!p) throw new Error('档案不存在')
        if (a.nickname !== undefined) p.nickname = String(a.nickname)
        if (a.birthday !== undefined) p.birthday = String(a.birthday)
        if (a.avatar !== undefined) p.avatar = String(a.avatar)
        save(db)
        return { ...p } as T
      }

      case 'set_level_override': {
        const hash = await sha256(db.settings.pin_salt + String(a.pin))
        assertPin(db.settings, String(a.pin), hash)
        const p = db.profiles.find((x) => x.id === Number(a.profileId))
        if (!p) throw new Error('档案不存在')
        const lvl = a.level === null ? null : Number(a.level)
        if (lvl !== null && (lvl < 1 || lvl > 5)) throw new Error('Level 必须在 1-5 之间')
        p.level_override = lvl
        save(db)
        return { ...p } as T
      }

      case 'delete_profile': {
        const id = Number(a.id)
        db.profiles = db.profiles.filter((p) => p.id !== id)
        db.records = db.records.filter((r) => r.profile_id !== id)
        db.achievements = db.achievements.filter((x) => x.profile_id !== id)
        db.usage = db.usage.filter((x) => x.profile_id !== id)
        db.items = db.items.filter((x) => x.profile_id !== id)
        db.equip = db.equip.filter((x) => x.profile_id !== id)
        save(db)
        return undefined as T
      }

      case 'get_parent_settings':
        return { ...db.settings } as T

      case 'verify_pin': {
        const hash = await sha256(db.settings.pin_salt + String(a.pin))
        return (hash === db.settings.pin_hash) as T
      }

      case 'change_pin': {
        const oldHash = await sha256(db.settings.pin_salt + String(a.oldPin))
        assertPin(db.settings, String(a.oldPin), oldHash)
        const np = String(a.newPin)
        if (!/^\d{4}$/.test(np)) throw new Error('新 PIN 必须是 4 位数字')
        db.settings.pin_salt = randomSalt()
        db.settings.pin_hash = await sha256(db.settings.pin_salt + np)
        db.settings.pin_is_default = false
        save(db)
        return { ...db.settings } as T
      }

      case 'set_daily_limit': {
        const hash = await sha256(db.settings.pin_salt + String(a.pin))
        assertPin(db.settings, String(a.pin), hash)
        const min = Number(a.minutes)
        if (min < 10 || min > 60) throw new Error('时长需在 10–60 分钟之间')
        db.settings.daily_limit_min = min
        save(db)
        return { ...db.settings } as T
      }

      case 'add_usage': {
        const id = Number(a.profileId)
        const secs = Math.max(0, Math.round(Number(a.seconds)))
        const day = todayStr()
        let row = db.usage.find((u) => u.profile_id === id && u.day === day)
        if (!row) {
          row = { profile_id: id, day, used_sec: 0 }
          db.usage.push(row)
        }
        row.used_sec += secs
        grantAchievements(db, id)
        save(db)
        return { ...row } as T
      }

      case 'get_today_usage': {
        const row = db.usage.find(
          (u) => u.profile_id === Number(a.profileId) && u.day === todayStr(),
        )
        return (row ? { ...row } : null) as T
      }

      case 'save_round': {
        const id = Number(a.profileId)
        const profile = db.profiles.find((p) => p.id === id)
        if (!profile) throw new Error('档案不存在')
        const correct = Number(a.correct)
        const total = Number(a.total)
        const level = Number(a.level)
        const gameType = String(a.gameType)
        if (total <= 0 || correct < 0 || correct > total) throw new Error('题数超出范围')
        if (level < 1 || level > 5) throw new Error('Level 必须在 1-5 之间')
        if (!VALID_GAMES.includes(gameType as never)) throw new Error('未知游戏类型')
        const accuracy = total > 0 ? correct / total : 0
        const stars = accuracy >= 1 ? 2 : accuracy >= 0.8 ? 1 : 0
        const rec: GameRecord = {
          id: db.seq++,
          profile_id: id,
          game_type: a.gameType as GameType,
          level: Number(a.level),
          correct,
          total,
          accuracy,
          stars_earned: stars,
          duration_sec: Number(a.durationSec),
          played_at: nowIso(),
        }
        db.records.push(rec)
        profile.stars_total += stars
        const newItems = grantItems(db, id)
        const newAch = grantAchievements(db, id)
        save(db)
        const result: SaveRoundResult = {
          record: rec,
          stars_earned: stars,
          stars_total: profile.stars_total,
          new_achievements: newAch,
          newly_unlocked_items: newItems,
        }
        return result as T
      }

      case 'list_records':
        return db.records
          .filter((r) => r.profile_id === Number(a.profileId))
          .slice()
          .sort((x, y) => (x.played_at < y.played_at ? 1 : -1)) as T

      case 'list_achievements':
        return db.achievements
          .filter((x) => x.profile_id === Number(a.profileId))
          .slice() as T

      case 'get_inventory': {
        const id = Number(a.profileId)
        return {
          unlocked: db.items
            .filter((i) => i.profile_id === id)
            .map((i) => ({ itemId: i.item_id, unlockedAt: i.unlocked_at })),
          equipped: db.equip.filter((e) => e.profile_id === id),
        } as T
      }

      case 'equip_item': {
        const id = Number(a.profileId)
        const slot = a.slot as ItemSlot
        const itemId = (a.itemId as string | null) ?? null
        const owned = db.items.some(
          (i) => i.profile_id === id && i.item_id === itemId,
        )
        if (itemId !== null && !owned) throw new Error('饰品尚未解锁')
        db.equip = db.equip.filter((e) => !(e.profile_id === id && e.slot === slot))
        if (itemId !== null) db.equip.push({ profile_id: id, slot, item_id: itemId })
        save(db)
        return db.equip.filter((e) => e.profile_id === id) as T
      }

      case 'get_stats': {
        const id = Number(a.profileId)
        const profile = db.profiles.find((p) => p.id === id)
        if (!profile) throw new Error('档案不存在')
        const equipped: Record<ItemSlot, string | null> = {
          hat: null,
          glasses: null,
          background: null,
          pet: null,
        }
        for (const e of db.equip.filter((x) => x.profile_id === id))
          equipped[e.slot] = e.item_id
        const result: ProfileStats = {
          profile: { ...profile },
          games: aggregateStats(db, id),
          unlocked_count: db.items.filter((i) => i.profile_id === id).length,
          equipped,
          today_used_sec:
            db.usage.find((u) => u.profile_id === id && u.day === todayStr())?.used_sec ?? 0,
          achievements: db.achievements.filter((x) => x.profile_id === id),
        }
        return result as T
      }

      case 'reset_progress': {
        const hash = await sha256(db.settings.pin_salt + String(a.pin))
        assertPin(db.settings, String(a.pin), hash)
        const id = Number(a.profileId)
        const profile = db.profiles.find((p) => p.id === id)
        if (!profile) throw new Error('档案不存在')
        db.records = db.records.filter((r) => r.profile_id !== id)
        db.achievements = db.achievements.filter((x) => x.profile_id !== id)
        db.usage = db.usage.filter((x) => x.profile_id !== id)
        db.items = db.items.filter((x) => x.profile_id !== id)
        db.equip = db.equip.filter((x) => x.profile_id !== id)
        profile.stars_total = 0
        save(db)
        return { ...profile } as T
      }

      default:
        throw new Error(`未知命令（浏览器降级后端）: ${cmd}`)
    }
  },
}
