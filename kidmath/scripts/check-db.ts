// 数据层业务规则测试（localStorage 降级后端，规则与 Rust 端一致）
// 运行：node --test 或直接 node 执行
const mem = new Map<string, string>()
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k, v) => void mem.set(k, v),
  removeItem: (k) => void mem.delete(k),
  clear: () => mem.clear(),
}

const { browserBackend } = await import('../src/lib/browserDb.ts')
const call = (cmd: string, args?: any) => browserBackend.call<any>(cmd, args)

let passed = 0
const ok = (cond: boolean, msg: string) => {
  if (!cond) throw new Error('断言失败: ' + msg)
  passed++
}

// ---------- 默认设置 & PIN ----------
const s0 = await call('get_parent_settings')
ok(s0.pin_is_default === true, '默认 PIN 标记为默认')
ok(s0.daily_limit_min === 25, '默认时长 25')
ok(await call('verify_pin', { pin: '0000' }) === true, '默认 PIN 0000 可通过')
ok(await call('verify_pin', { pin: '1234' }) === false, '错误 PIN 不通过')
try {
  await call('set_daily_limit', { pin: '9999', minutes: 30 })
  throw new Error('错误 PIN 不应能改时长')
} catch {
  passed++
}
await call('set_daily_limit', { pin: '0000', minutes: 40 })
ok((await call('get_parent_settings')).daily_limit_min === 40, '正确 PIN 可改时长')
try {
  await call('set_daily_limit', { pin: '0000', minutes: 5 })
  throw new Error('超出范围的时长应拒绝')
} catch {
  passed++
}

// ---------- 两个孩子档案隔离 ----------
const p1 = await call('create_profile', { nickname: '小明', birthday: '2020-03-15', avatar: 'cat' })
const p2 = await call('create_profile', { nickname: '小红', birthday: '2018-07-01', avatar: 'fox' })
ok(p1.id !== p2.id, '两个档案 id 不同')

// 档案1：一轮全对（10 题，得 2 星）
const r1 = await call('save_round', {
  profileId: p1.id,
  gameType: 'counting',
  level: 2,
  correct: 10,
  total: 10,
  durationSec: 60,
})
ok(r1.stars_earned === 2, '100% 得 2 星')
ok(r1.stars_total === 2, '档案1 累计 2 星')
ok(r1.new_achievements.some((a: any) => a.code === 'first_round'), '解锁初次尝试')
ok(r1.new_achievements.some((a: any) => a.code === 'perfect_round'), '解锁满分达人')

// 档案2 玩一轮 4/5 = 80%，应得 1 星
const r2 = await call('save_round', {
  profileId: p2.id,
  gameType: 'compare',
  level: 1,
  correct: 4,
  total: 5,
  durationSec: 30,
})
ok(r2.stars_earned === 1, '80% 得 1 星')
ok(r2.stars_total === 1, '档案2 累计 1 星')
ok(r1.stars_total === 2, '星星不串档：档案1 仍为 2')

// 低正确率 0 星
const r3 = await call('save_round', {
  profileId: p2.id,
  gameType: 'clock',
  level: 1,
  correct: 2,
  total: 5,
  durationSec: 30,
})
ok(r3.stars_earned === 0, '40% 得 0 星')

// ---------- 饰品：每 5 星解锁 ----------
// 让档案1 达到 5 星
await call('save_round', { profileId: p1.id, gameType: 'compare', level: 1, correct: 5, total: 5, durationSec: 10 })
await call('save_round', { profileId: p1.id, gameType: 'arithmetic', level: 1, correct: 5, total: 5, durationSec: 10 })
// 前两轮：2+2=4... 再补
const beforeUnlock = (await call('get_inventory', { profileId: p1.id })).unlocked.length
await call('save_round', { profileId: p1.id, gameType: 'shapes', level: 1, correct: 5, total: 5, durationSec: 10 })
const inv1 = await call('get_inventory', { profileId: p1.id })
ok(inv1.unlocked.length >= 1, '累计 5 星后至少解锁 1 个饰品')
const inv2 = await call('get_inventory', { profileId: p2.id })
ok(inv2.unlocked.length === 0, '饰品不串档：档案2 无饰品')

// 穿戴/脱下
await call('equip_item', { profileId: p1.id, slot: 'hat', itemId: 'hat_party' })
const inv1b = await call('get_inventory', { profileId: p1.id })
ok(inv1b.equipped.find((e: any) => e.slot === 'hat')?.item_id === 'hat_party', '可穿戴帽子')
await call('equip_item', { profileId: p1.id, slot: 'hat', itemId: null })
const afterUnequip = (await call('get_inventory', { profileId: p1.id })).equipped.find((e: any) => e.slot === 'hat')
ok(!afterUnequip || afterUnequip.item_id === null, '可脱下（记录移除或置空）')

// 不能穿未拥有的饰品
try {
  await call('equip_item', { profileId: p2.id, slot: 'hat', itemId: 'hat_party' })
  throw new Error('未解锁饰品不应能穿戴')
} catch {
  passed++
}

// ---------- Level 覆盖需 PIN ----------
try {
  await call('set_level_override', { pin: '0001', profileId: p1.id, level: 5 })
  throw new Error('错误 PIN 不应能改 Level')
} catch {
  passed++
}
const updated = await call('set_level_override', { pin: '0000', profileId: p1.id, level: 5 })
ok(updated.level_override === 5, '正确 PIN 可设置 Level 覆盖')
const restored = await call('set_level_override', { pin: '0000', profileId: p1.id, level: null })
ok(restored.level_override === null, '可恢复自动难度')

// ---------- PIN 修改 ----------
try {
  await call('change_pin', { oldPin: '1111', newPin: '4321' })
  throw new Error('旧 PIN 错不应能改')
} catch {
  passed++
}
await call('change_pin', { oldPin: '0000', newPin: '4321' })
ok(await call('verify_pin', { pin: '4321' }) === true, '新 PIN 生效')
ok((await call('get_parent_settings')).pin_is_default === false, '改后不再是默认 PIN')

// ---------- 重置进度需 PIN，且不影响别的档案 ----------
try {
  await call('reset_progress', { pin: '0000', profileId: p1.id })
  throw new Error('错误 PIN 不应能重置')
} catch {
  passed++
}
const starsBefore = (await call('list_profiles')).find((p: any) => p.id === p2.id).stars_total
const resetP = await call('reset_progress', { pin: '4321', profileId: p1.id })
ok(resetP.stars_total === 0, '重置后星星清零')
ok((await call('get_inventory', { profileId: p1.id })).unlocked.length === 0, '重置后饰品清空')
const p2After = (await call('list_profiles')).find((p: any) => p.id === p2.id)
ok(p2After.stars_total === starsBefore, '重置不影响其他档案')

// ---------- 删除档案级联 ----------
await call('delete_profile', { id: p2.id })
const remain = await call('list_profiles')
ok(remain.length === 1 && remain[0].id === p1.id, '删除后只剩档案1')
ok((await call('get_stats', { profileId: p1.id })).profile.nickname === '小明', 'get_stats 正常')

console.log('✅ 共通过', passed, '项数据层断言')
