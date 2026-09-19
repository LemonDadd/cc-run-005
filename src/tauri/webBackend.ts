// =============================================================================
// 浏览器开发/预览用的本地降级后端（仅在非 Tauri 环境启用）。
// 它用 localStorage 完整镜像 Rust 端的表结构与规则（星星、饰品、成就、PIN、
// 时长、隔离），让 `npm run dev` 在浏览器里也能完整体验。
// 真正的桌面构建始终走 Tauri command + SQLite，绝不使用本文件访问文件系统。
// =============================================================================
import {
  ACHIEVEMENTS,
  DAILY_LIMIT_DEFAULT,
  DEFAULT_PIN,
  GAME_TYPES,
  ITEMS,
  effectiveLevel,
  starsForAccuracy,
} from "../game/catalog";
import type {
  Achievement,
  Profile,
  ProfileInput,
  ProfileStats,
  RecordGameInput,
  SafeSettings,
  SessionResult,
  UnlockedItem,
  UsageStatus,
} from "../types";

interface RecordRow {
  id: number;
  profileId: number;
  gameType: string;
  level: number;
  correct: number;
  total: number;
  accuracy: number;
  stars: number;
  playedAt: string;
}

interface ItemRow {
  profileId: number;
  itemCode: string;
  unlockedAt: string;
}

interface AchRow {
  id: number;
  profileId: number;
  code: string;
  unlockedAt: string;
}

interface UsageRow {
  profileId: number;
  date: string;
  usedSeconds: number;
}

interface Settings {
  pinHash: string;
  dailyLimitMinutes: number;
  isDefaultPin: boolean;
}

const K = {
  profiles: "kidmath.profiles",
  records: "kidmath.records",
  achievements: "kidmath.achievements",
  items: "kidmath.items",
  usage: "kidmath.usage",
  settings: "kidmath.settings",
  seq: "kidmath.seq",
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function nextId(): number {
  const n = read<number>(K.seq, 0) + 1;
  write(K.seq, n);
  return n;
}

function nowIso(): string {
  return new Date().toISOString();
}

function today(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// 非加密的稳定字符串哈希，仅供浏览器降级时校验 PIN（桌面端用 Rust SHA-256）。
function pseudoHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return `dev:${h >>> 0}`;
}

function getSettings(): Settings {
  return read<Settings | null>(K.settings, null) ?? {
    pinHash: pseudoHash(DEFAULT_PIN),
    dailyLimitMinutes: DAILY_LIMIT_DEFAULT,
    isDefaultPin: true,
  };
}

function saveSettings(s: Settings): void {
  write(K.settings, s);
}

function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

function ageOf(birthday: string): number {
  const b = new Date(birthday + "T00:00:00");
  const t = new Date();
  if (isNaN(b.getTime())) return 0;
  let age = t.getFullYear() - b.getFullYear();
  const before =
    t.getMonth() < b.getMonth() ||
    (t.getMonth() === b.getMonth() && t.getDate() < b.getDate());
  if (before) age -= 1;
  return Math.max(0, age);
}

function hasStreak(dates: Set<string>, n: number): boolean {
  const t = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(t);
    d.setDate(t.getDate() - i);
    const m = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");
    const key = `${d.getFullYear()}-${m}-${day}`;
    if (!dates.has(key)) return false;
  }
  return true;
}

function evaluateAchievements(
  profileId: number,
  records: RecordRow[],
  items: ItemRow[],
  starsTotal: number,
  perfectThisRound: boolean
): string[] {
  const mine = records.filter((r) => r.profileId === profileId);
  const rounds = mine.length;
  const totalCorrect = mine.reduce((s, r) => s + r.correct, 0);
  const games = new Set(mine.map((r) => r.gameType));
  const itemCount = items.filter((i) => i.profileId === profileId).length;
  const dates = new Set(mine.map((r) => r.playedAt.slice(0, 10)));
  const earned = new Set(
    read<AchRow[]>(K.achievements, [])
      .filter((a) => a.profileId === profileId)
      .map((a) => a.code)
  );
  const out: string[] = [];
  const grant = (code: string, ok: boolean) => {
    if (ok && !earned.has(code)) out.push(code);
  };
  grant("first_round", rounds >= 1);
  grant("rounds_10", rounds >= 10);
  grant("rounds_25", rounds >= 25);
  grant("streak_3_days", hasStreak(dates, 3));
  grant("perfect_game", perfectThisRound);
  grant("correct_50", totalCorrect >= 50);
  grant("explore_all", GAME_TYPES.every((g) => games.has(g)));
  grant("items_5", itemCount >= 5);
  grant("stars_30", starsTotal >= 30);
  return out;
}

export const webBackend = {
  async handle<T>(cmd: string, args: Record<string, unknown>): Promise<T> {
    // 用微任务模拟异步 IPC。
    await Promise.resolve();
    const fn = (HANDLERS as unknown as Record<
      string,
      (a: Record<string, unknown>) => unknown
    >)[cmd];
    if (!fn) throw new Error(`未知命令（浏览器降级）: ${cmd}`);
    return fn(args) as T;
  },
};

const HANDLERS = {
  list_profiles: () => read<Profile[]>(K.profiles, []),

  create_profile: ({ input }: { input: ProfileInput }) => {
    const profiles = read<Profile[]>(K.profiles, []);
    if (!input.nickname.trim()) throw new Error("昵称不能为空");
    if (isNaN(new Date(input.birthday + "T00:00:00").getTime()))
      throw new Error("生日格式不正确");
    const profile: Profile = {
      id: nextId(),
      nickname: input.nickname.trim(),
      birthday: input.birthday,
      avatar: input.avatar,
      levelOverride: null,
      starsTotal: 0,
      equipped: "{}",
      createdAt: nowIso(),
    };
    profiles.push(profile);
    write(K.profiles, profiles);
    return profile;
  },

  update_profile: ({ id, input }: { id: number; input: ProfileInput }) => {
    const profiles = read<Profile[]>(K.profiles, []);
    const p = profiles.find((x) => x.id === id);
    if (!p) throw new Error("档案不存在");
    if (!input.nickname.trim()) throw new Error("昵称不能为空");
    p.nickname = input.nickname.trim();
    p.birthday = input.birthday;
    p.avatar = input.avatar;
    write(K.profiles, profiles);
    return p;
  },

  delete_profile: ({ id }: { id: number }) => {
    write(
      K.profiles,
      read<Profile[]>(K.profiles, []).filter((p) => p.id !== id)
    );
    write(
      K.records,
      read<RecordRow[]>(K.records, []).filter((r) => r.profileId !== id)
    );
    write(
      K.achievements,
      read<AchRow[]>(K.achievements, []).filter((a) => a.profileId !== id)
    );
    write(
      K.items,
      read<ItemRow[]>(K.items, []).filter((i) => i.profileId !== id)
    );
    write(
      K.usage,
      read<UsageRow[]>(K.usage, []).filter((u) => u.profileId !== id)
    );
  },

  set_level_override: ({ profileId, level }: { profileId: number; level: number | null }) => {
    if (level != null && (level < 1 || level > 5))
      throw new Error("难度等级必须在 1-5 之间");
    const profiles = read<Profile[]>(K.profiles, []);
    const p = profiles.find((x) => x.id === profileId);
    if (!p) throw new Error("档案不存在");
    p.levelOverride = level;
    write(K.profiles, profiles);
  },

  set_equipped: ({
    profileId,
    slot,
    itemCode,
  }: {
    profileId: number;
    slot: string;
    itemCode: string | null;
  }) => {
    const profiles = read<Profile[]>(K.profiles, []);
    const p = profiles.find((x) => x.id === profileId);
    if (!p) throw new Error("档案不存在");
    const map = JSON.parse(p.equipped || "{}") as Record<string, string>;
    if (itemCode) {
      const owned = read<ItemRow[]>(K.items, []).some(
        (i) => i.profileId === profileId && i.itemCode === itemCode
      );
      if (!owned) throw new Error("该饰品尚未解锁");
      const def = ITEMS.find((i) => i.code === itemCode);
      if (!def || def.slot !== slot) throw new Error("饰品与装备槽不匹配");
      map[slot] = itemCode;
    } else {
      delete map[slot];
    }
    p.equipped = JSON.stringify(map);
    write(K.profiles, profiles);
    return p.equipped;
  },

  get_settings: (): SafeSettings => {
    const s = getSettings();
    return {
      dailyLimitMinutes: s.dailyLimitMinutes,
      isDefaultPin: s.isDefaultPin,
    };
  },

  verify_pin: ({ pin }: { pin: string }) => getSettings().pinHash === pseudoHash(pin),

  change_pin: ({ oldPin, newPin }: { oldPin: string; newPin: string }) => {
    const s = getSettings();
    if (s.pinHash !== pseudoHash(oldPin)) throw new Error("原 PIN 不正确");
    if (!isValidPin(newPin)) throw new Error("新 PIN 必须是 4 位数字");
    s.pinHash = pseudoHash(newPin);
    s.isDefaultPin = newPin === DEFAULT_PIN;
    saveSettings(s);
  },

  set_daily_limit: ({ minutes }: { minutes: number }) => {
    if (minutes < 10 || minutes > 60) throw new Error("每日时长需在 10-60 分钟之间");
    const s = getSettings();
    s.dailyLimitMinutes = minutes;
    saveSettings(s);
  },

  get_usage: ({ profileId }: { profileId: number }): UsageStatus => {
    const s = getSettings();
    const date = today();
    const row = read<UsageRow[]>(K.usage, []).find(
      (u) => u.profileId === profileId && u.date === date
    );
    const used = row?.usedSeconds ?? 0;
    const limit = s.dailyLimitMinutes * 60;
    return {
      date,
      usedSeconds: used,
      limitSeconds: limit,
      remainingSeconds: Math.max(0, limit - used),
      limitReached: used >= limit,
    };
  },

  add_usage: ({ profileId, seconds }: { profileId: number; seconds: number }) => {
    const rows = read<UsageRow[]>(K.usage, []);
    const date = today();
    let row = rows.find((u) => u.profileId === profileId && u.date === date);
    if (!row) {
      row = { profileId, date, usedSeconds: 0 };
      rows.push(row);
    }
    if (seconds > 0) row.usedSeconds += seconds;
    write(K.usage, rows);
    return HANDLERS.get_usage({ profileId });
  },

  record_game: ({ input }: { input: RecordGameInput }): SessionResult => {
    const profiles = read<Profile[]>(K.profiles, []);
    const p = profiles.find((x) => x.id === input.profileId);
    if (!p) throw new Error("档案不存在");
    if (!GAME_TYPES.includes(input.gameType as (typeof GAME_TYPES)[number]))
      throw new Error("未知的游戏类型");
    if (input.level < 1 || input.level > 5) throw new Error("难度等级必须在 1-5 之间");
    if (input.total <= 0 || input.correct < 0 || input.correct > input.total)
      throw new Error("题目数据不合法");

    const accuracy = input.correct / input.total;
    const stars = starsForAccuracy(accuracy);
    const ts = nowIso();

    const records = read<RecordRow[]>(K.records, []);
    records.push({
      id: nextId(),
      profileId: input.profileId,
      gameType: input.gameType,
      level: input.level,
      correct: input.correct,
      total: input.total,
      accuracy,
      stars,
      playedAt: ts,
    });
    write(K.records, records);

    p.starsTotal += stars;
    write(K.profiles, profiles);

    // 解锁饰品。
    const items = read<ItemRow[]>(K.items, []);
    const newItems: UnlockedItem[] = [];
    for (const def of ITEMS) {
      if (
        p.starsTotal >= def.atStars &&
        !items.some((i) => i.profileId === p.id && i.itemCode === def.code)
      ) {
        items.push({ profileId: p.id, itemCode: def.code, unlockedAt: ts });
        newItems.push({ itemCode: def.code, unlockedAt: ts });
      }
    }
    write(K.items, items);

    // 成就。
    const codes = evaluateAchievements(
      p.id,
      records,
      items,
      p.starsTotal,
      input.correct === input.total
    );
    const achievements = read<AchRow[]>(K.achievements, []);
    const newAchievements: Achievement[] = [];
    for (const code of codes) {
      const row: AchRow = { id: nextId(), profileId: p.id, code, unlockedAt: ts };
      achievements.push(row);
      newAchievements.push(row);
    }
    write(K.achievements, achievements);

    return {
      stars,
      accuracy,
      correct: input.correct,
      total: input.total,
      starsTotal: p.starsTotal,
      newItems,
      newAchievements,
    };
  },

  list_items: ({ profileId }: { profileId: number }): UnlockedItem[] =>
    read<ItemRow[]>(K.items, [])
      .filter((i) => i.profileId === profileId)
      .map((i) => ({ itemCode: i.itemCode, unlockedAt: i.unlockedAt })),

  list_achievements: ({ profileId }: { profileId: number }): Achievement[] =>
    read<AchRow[]>(K.achievements, []).filter((a) => a.profileId === profileId),

  profile_level_info: ({ profileId }: { profileId: number }) => {
    const p = read<Profile[]>(K.profiles, []).find((x) => x.id === profileId);
    if (!p) throw new Error("档案不存在");
    const age = ageOf(p.birthday);
    return { ageYears: age, effectiveLevel: effectiveLevel(p.levelOverride, age) };
  },

  get_stats: ({ profileId }: { profileId: number }): ProfileStats => {
    const p = read<Profile[]>(K.profiles, []).find((x) => x.id === profileId);
    if (!p) throw new Error("档案不存在");
    const mine = read<RecordRow[]>(K.records, []).filter((r) => r.profileId === profileId);
    const age = ageOf(p.birthday);
    const totalCorrect = mine.reduce((s, r) => s + r.correct, 0);
    const totalQuestions = mine.reduce((s, r) => s + r.total, 0);
    const games = GAME_TYPES.map((gt) => {
      const gr = mine.filter((r) => r.gameType === gt);
      return {
        gameType: gt,
        rounds: gr.length,
        bestLevel: gr.reduce((m, r) => Math.max(m, r.level), 0),
        totalCorrect: gr.reduce((s, r) => s + r.correct, 0),
        totalQuestions: gr.reduce((s, r) => s + r.total, 0),
        accuracy:
          gr.reduce((s, r) => s + r.total, 0) > 0
            ? gr.reduce((s, r) => s + r.correct, 0) / gr.reduce((s, r) => s + r.total, 0)
            : 0,
      };
    }).filter((g) => g.rounds > 0);
    return {
      profile: p,
      ageYears: age,
      effectiveLevel: effectiveLevel(p.levelOverride, age),
      roundsTotal: mine.length,
      totalCorrect,
      totalQuestions,
      accuracy: totalQuestions > 0 ? totalCorrect / totalQuestions : 0,
      games,
      achievements: read<AchRow[]>(K.achievements, []).filter((a) => a.profileId === profileId),
      itemsUnlocked: read<ItemRow[]>(K.items, []).filter((i) => i.profileId === profileId)
        .length,
    };
  },
};

// 让 ACHIEVEMENTS 在类型上被引用（保持与目录同步的意图说明）。
void ACHIEVEMENTS;
