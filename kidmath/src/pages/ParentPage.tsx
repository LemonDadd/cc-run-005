// /parent 家长面板：PIN 进入后可改 PIN、设每日时长、查看每个孩子的统计、
// 手动调整 Level、重置进度、删除档案。所有写操作均由 Rust 端再次校验 PIN。
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AvatarSvg } from '../assets/svgs/AvatarSvg'
import { PinPad } from '../components/PinPad'
import { TopBar } from '../components/TopBar'
import {
  ACHIEVEMENTS,
  DAILY_LIMIT_MAX,
  DAILY_LIMIT_MIN,
  DEFAULT_DAILY_LIMIT_MIN,
  GAMES,
} from '../constants/games'
import { db } from '../lib/db'
import { resetProgress, setProfileLevelOverride } from '../lib/db-extra'
import { useApp } from '../lib/store'
import type { ParentSettings, ProfileStats } from '../types'
import { ageFromBirthday, defaultLevelForAge, formatTime } from '../utils/date'
import { sfxClick } from '../utils/sound'

export function ParentPage() {
  const navigate = useNavigate()
  const { profiles, settings, refreshProfiles, refreshSettings } = useApp()
  const [authedPin, setAuthedPin] = useState<string | null>(null)
  const [tab, setTab] = useState<'overview' | 'settings'>('overview')

  useEffect(() => {
    void refreshProfiles()
    void refreshSettings()
  }, [refreshProfiles, refreshSettings])

  if (!authedPin) {
    return (
      <div className="page" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <PinPad
          title="家长验证"
          subtitle={
            settings?.pin_is_default
              ? '当前为默认 PIN：0000，进入后请及时修改'
              : '请输入 4 位家长 PIN'
          }
          onCancel={() => navigate(-1)}
          onSubmit={async (pin) => db.verifyPin(pin)}
        />
      </div>
    )
  }

  return (
    <div className="page">
      <TopBar
        title="家长面板"
        onBack={() => navigate('/home')}
        right={
          <div className="seg">
            <button className={tab === 'overview' ? 'on' : ''} onClick={() => setTab('overview')}>
              孩子进度
            </button>
            <button className={tab === 'settings' ? 'on' : ''} onClick={() => setTab('settings')}>
              家长设置
            </button>
          </div>
        }
      />
      <div className="center-wrap" style={{ alignItems: 'flex-start' }}>
        {tab === 'overview' ? (
          <ProfilesOverview pin={authedPin} profiles={profiles} />
        ) : (
          <ParentSettingsView
            pin={authedPin}
            settings={settings}
            onChanged={() => {
              void refreshSettings()
            }}
          />
        )}
      </div>
    </div>
  )
}

function ProfilesOverview({ pin, profiles }: { pin: string; profiles: ReturnType<typeof useApp.getState>['profiles'] }) {
  const [selected, setSelected] = useState<number | null>(profiles[0]?.id ?? null)
  const [stats, setStats] = useState<ProfileStats | null>(null)
  const navigate = useNavigate()
  const removeProfile = useApp((s) => s.removeProfile)

  useEffect(() => {
    if (selected === null) return
    let alive = true
    void db.getStats(selected).then((s) => alive && setStats(s))
    return () => {
      alive = false
    }
  }, [selected])

  if (profiles.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 24 }}>还没有孩子的档案，先回首页创建一个吧。</p>
      </div>
    )
  }

  const p = profiles.find((x) => x.id === selected) ?? profiles[0]

  return (
    <div style={{ width: 'min(1060px, 96vw)' }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        {profiles.map((pr) => (
          <button
            key={pr.id}
            onClick={() => {
              sfxClick()
              setSelected(pr.id)
            }}
            className="card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 18px',
              border: pr.id === p.id ? '4px solid #ff8a3d' : '4px solid transparent',
              background: pr.id === p.id ? '#fff4e8' : '#fff',
            }}
          >
            <AvatarSvg avatar={pr.avatar} size={48} />
            <span style={{ fontSize: 22, fontWeight: 800 }}>{pr.nickname}</span>
          </button>
        ))}
      </div>

      {stats && <ProfileDetail key={p.id} pin={pin} stats={stats} />}

      <div style={{ display: 'flex', gap: 14, justifyContent: 'flex-end', marginTop: 20 }}>
        <button
          className="ghost-btn"
          onClick={() => {
            if (confirm(`确定删除「${p.nickname}」的档案吗？该孩子的星星、进度、成就都会删除且无法恢复。`)) {
              void removeProfile(p.id).then(() => {
                setSelected(profiles.find((x) => x.id !== p.id)?.id ?? null)
                navigate('/home')
              })
            }
          }}
        >
          🗑️ 删除该档案
        </button>
      </div>
    </div>
  )
}

function ProfileDetail({ pin, stats }: { pin: string; stats: ProfileStats }) {
  const { profile, games, achievements, today_used_sec, unlocked_count } = stats
  const age = ageFromBirthday(profile.birthday)
  const autoLevel = defaultLevelForAge(age)
  const [override, setOverride] = useState<number | null>(profile.level_override)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const refreshProfiles = useApp((s) => s.refreshProfiles)
  const navigate = useNavigate()

  const showToast = (t: string) => {
    setToast(t)
    window.setTimeout(() => setToast(''), 2200)
  }

  const saveLevel = async (lvl: number | null) => {
    setBusy(true)
    try {
      await setProfileLevelOverride(pin, profile.id, lvl)
      setOverride(lvl)
      await refreshProfiles()
      showToast('难度已保存')
    } catch (e) {
      showToast('保存失败：PIN 可能不正确')
    } finally {
      setBusy(false)
    }
  }

  const doReset = async () => {
    if (!confirm(`确定重置「${profile.nickname}」的全部进度吗？星星、记录、成就、饰品都会清空（档案保留）。`))
      return
    try {
      await resetProgress(pin, profile.id)
      await refreshProfiles()
      showToast('进度已重置')
      navigate('/home')
    } catch {
      showToast('重置失败：PIN 可能不正确')
    }
  }

  const gotCodes = useMemo(() => new Set(achievements.map((a) => a.code)), [achievements])

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <AvatarSvg avatar={profile.avatar} size={84} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <h3 style={{ fontSize: 28 }}>
            {profile.nickname} · {age} 岁
          </h3>
          <p className="hint-text">
            生日 {profile.birthday} · 累计 ⭐ {profile.stars_total} · 今日已玩{' '}
            {formatTime(today_used_sec)} · 饰品 {unlocked_count} 个
          </p>
        </div>
      </div>

      <h4 style={{ fontSize: 22, margin: '18px 0 8px' }}>手动调整难度 Level</h4>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="seg">
          <button
            className={override === null ? 'on' : ''}
            disabled={busy}
            onClick={() => void saveLevel(null)}
          >
            按年龄自动（{autoLevel}）
          </button>
          {[1, 2, 3, 4, 5].map((l) => (
            <button
              key={l}
              className={override === l ? 'on' : ''}
              disabled={busy}
              onClick={() => void saveLevel(l)}
            >
              L{l}
            </button>
          ))}
        </div>
        <span className="hint-text">
          {override === null ? `当前自动 Level ${autoLevel}` : `当前家长设定 Level ${override}`}
        </span>
      </div>

      <h4 style={{ fontSize: 22, margin: '20px 0 8px' }}>各游戏正确率与进度</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        {GAMES.map((g) => {
          const s = games.find((x) => x.game_type === g.type)
          const acc = s && s.total_questions > 0 ? Math.round((s.total_correct / s.total_questions) * 100) : null
          return (
            <div
              key={g.type}
              style={{
                border: '3px solid rgba(43,33,64,0.08)',
                borderRadius: 18,
                padding: 14,
                background: '#faf8ff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 22 }}>
                <span>{g.emoji}</span> {g.name}
              </div>
              {s ? (
                <>
                  <p className="hint-text" style={{ marginTop: 6 }}>
                    回合 {s.rounds} · 最高 Level {s.best_level}
                  </p>
                  <div style={{ height: 16, borderRadius: 999, background: '#e6e0f2', marginTop: 6, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${acc ?? 0}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg,#7ac142,#46b65c)',
                      }}
                    />
                  </div>
                  <p style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>综合正确率 {acc}%</p>
                  <p className="hint-text">最佳单轮 {Math.round(s.best_accuracy * 100)}%</p>
                </>
              ) : (
                <p className="hint-text" style={{ marginTop: 8 }}>
                  还没有玩过
                </p>
              )}
            </div>
          )
        })}
      </div>

      <h4 style={{ fontSize: 22, margin: '20px 0 8px' }}>成就徽章（{achievements.length}/{ACHIEVEMENTS.length}）</h4>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {ACHIEVEMENTS.map((a) => {
          const got = gotCodes.has(a.code)
          return (
            <div
              key={a.code}
              title={a.desc}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                borderRadius: 999,
                background: got ? '#fff6d8' : '#f0edf6',
                border: `3px solid ${got ? '#ffc93c' : 'transparent'}`,
                opacity: got ? 1 : 0.6,
                fontSize: 20,
                fontWeight: 700,
              }}
            >
              <span style={{ fontSize: 26, filter: got ? 'none' : 'grayscale(1)' }}>{a.emoji}</span>
              {a.name}
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 22 }}>
        <button className="ghost-btn" style={{ borderColor: 'rgba(213,80,80,0.4)', color: '#b54040' }} onClick={() => void doReset()}>
          ↺ 重置该孩子的全部进度
        </button>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

function ParentSettingsView({
  pin,
  settings,
  onChanged,
}: {
  pin: string
  settings: ParentSettings | null
  onChanged: () => void
}) {
  const [limit, setLimit] = useState(settings?.daily_limit_min ?? DEFAULT_DAILY_LIMIT_MIN)
  const [oldPin, setOldPin] = useState(pin)
  const [newPin, setNewPin] = useState('')
  const [toast, setToast] = useState('')

  const showToast = (t: string) => {
    setToast(t)
    window.setTimeout(() => setToast(''), 2400)
  }

  const saveLimit = async () => {
    try {
      await db.setDailyLimit(pin, limit)
      onChanged()
      showToast(`每日游玩时长已设为 ${limit} 分钟`)
    } catch {
      showToast('保存失败，请检查 PIN')
    }
  }

  const savePin = async () => {
    if (!/^\d{4}$/.test(newPin)) {
      showToast('新 PIN 必须是 4 位数字')
      return
    }
    if (newPin === '0000') {
      if (!confirm('0000 是默认 PIN，容易被孩子猜到，确定仍要使用吗？')) return
    }
    try {
      await db.changePin(oldPin, newPin)
      setNewPin('')
      onChanged()
      showToast('PIN 已修改，下次进入家长面板请使用新 PIN')
    } catch {
      showToast('原 PIN 不正确，修改失败')
    }
  }

  return (
    <div style={{ width: 'min(720px, 96vw)', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="card">
        <h3 style={{ fontSize: 26, marginBottom: 10 }}>⏰ 每日游玩时长</h3>
        <p className="hint-text" style={{ marginBottom: 14 }}>
          默认 25 分钟，可调 {DAILY_LIMIT_MIN}–{DAILY_LIMIT_MAX} 分钟。到点会温柔提醒休息并保存进度。
        </p>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="range"
            min={DAILY_LIMIT_MIN}
            max={DAILY_LIMIT_MAX}
            step={5}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            style={{ flex: 1, minWidth: 220, height: 40 }}
          />
          <span style={{ fontSize: 28, fontWeight: 900, minWidth: 110 }}>{limit} 分钟/天</span>
          <button className="big-btn green" style={{ minHeight: 64, fontSize: 22 }} onClick={() => void saveLimit()}>
            保存时长
          </button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 26, marginBottom: 10 }}>🔢 修改家长 PIN</h3>
        <p className="hint-text" style={{ marginBottom: 14 }}>
          {settings?.pin_is_default
            ? '⚠️ 当前仍是默认 PIN 0000，建议立即修改。'
            : 'PIN 以加盐哈希方式保存在本地数据库，无法被逆向读出。'}
        </p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="text-input"
            inputMode="numeric"
            maxLength={4}
            placeholder="新 4 位 PIN"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            style={{ maxWidth: 200 }}
          />
          <button className="big-btn blue" style={{ minHeight: 64, fontSize: 22 }} onClick={() => void savePin()}>
            修改 PIN
          </button>
        </div>
      </div>

      <div className="card" style={{ background: '#f4f9ff' }}>
        <h3 style={{ fontSize: 24, marginBottom: 8 }}>ℹ️ 隐私与离线说明</h3>
        <p className="hint-text">
          本应用完全离线运行：无账号登录、无网络请求、无广告与内购，所有数据仅保存在本机。
          应用未申请网络权限，孩子的昵称、生日与游戏记录不会离开这台电脑。
        </p>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
