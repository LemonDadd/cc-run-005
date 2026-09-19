/** 日期工具：年龄按生日自动计算（本地时区） */

export function todayStr(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 由生日计算周岁；非法日期返回 3（产品面向 3-8 岁的安全默认） */
export function ageFromBirthday(birthday: string, now: Date = new Date()): number {
  const b = new Date(birthday + 'T00:00:00')
  if (Number.isNaN(b.getTime())) return 3
  let age = now.getFullYear() - b.getFullYear()
  const beforeBirthdayThisYear =
    now.getMonth() < b.getMonth() ||
    (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())
  if (beforeBirthdayThisYear) age -= 1
  return Math.max(0, age)
}

/** 默认难度 Level = max(1, min(5, age-2))；家长可覆盖 */
export function defaultLevelForAge(age: number): number {
  return Math.max(1, Math.min(5, age - 2))
}

export function effectiveLevel(
  birthday: string,
  override: number | null,
  now: Date = new Date(),
): number {
  if (override !== null && override >= 1 && override <= 5) return override
  return defaultLevelForAge(ageFromBirthday(birthday, now))
}

/** 计算连续游玩天数（含今天或截至最近一天），用于连续 3 天成就的判断 */
export function consecutiveDays(days: string[]): number {
  if (days.length === 0) return 0
  const set = new Set(days)
  let streak = 0
  const cursor = new Date()
  // 今天没玩也可以从昨天开始计
  if (!set.has(todayStr(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (set.has(todayStr(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
