// /home 首页：当前玩家头像/星星、六个游戏入口、“即将推出”、切换玩家、家长入口
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AvatarSvg } from '../assets/svgs/AvatarSvg'
import { COMING_SOON, GAMES } from '../constants/games'
import { useApp } from '../lib/store'
import type { GameType } from '../types'
import { effectiveLevel } from '../utils/date'
import { sfxClick } from '../utils/sound'
import { SoundToggle } from '../components/SoundToggle'

export function HomePage() {
  const navigate = useNavigate()
  const current = useApp((s) => s.current)
  const refreshProfiles = useApp((s) => s.refreshProfiles)

  // 每次回到首页刷新星星总数（奖励页、装扮页可能改变数据）
  useEffect(() => {
    void refreshProfiles()
  }, [refreshProfiles])

  useEffect(() => {
    if (!current) navigate('/', { replace: true })
  }, [current, navigate])

  if (!current) return null

  const level = effectiveLevel(current.birthday, current.level_override)

  const enterGame = (t: GameType) => {
    sfxClick()
    navigate(`/game/${t}`)
  }

  return (
    <div
      className="page scroll-area"
      style={{ alignItems: 'center', padding: '10px 24px 30px' }}
    >
      <div className="topbar" style={{ width: '100%', maxWidth: 1060 }}>
        <button className="ghost-btn" onClick={() => navigate('/')}>
          🔄 切换玩家
        </button>
        <div className="spacer" />
        <SoundToggle />
        <button className="ghost-btn" onClick={() => navigate('/parent')}>
          👪 家长
        </button>
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: 1060,
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          background: '#fff',
          borderRadius: 28,
          padding: '16px 28px',
          boxShadow: '0 8px 0 rgba(43,33,64,0.07)',
        }}
      >
        <button
          onClick={() => navigate('/gallery')}
          title="装扮与饰品图鉴"
          style={{ borderRadius: '50%', padding: 0, lineHeight: 0, flexShrink: 0 }}
        >
          <AvatarSvg avatar={current.avatar} size={92} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 38 }}>{current.nickname}</h1>
          <p className="hint-text">
            {current.level_override ? '家长设置 ' : '自动 '}
            Level {level} · 点头像可以打扮自己哦
          </p>
        </div>
        <div className="star-chip" style={{ fontSize: 30 }}>
          ⭐ {current.stars_total}
        </div>
      </div>

      <h2 style={{ margin: '26px 0 16px', fontSize: 30 }}>选一个游戏开始吧！</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 22,
          width: '100%',
          maxWidth: 1060,
        }}
      >
        {GAMES.map((g, i) => (
          <button
            key={g.type}
            className="card pop-in"
            onClick={() => enterGame(g.type)}
            style={{
              animationDelay: `${i * 50}ms`,
              background: `linear-gradient(160deg, #fff 60%, ${g.color}22)`,
              borderBottom: `8px solid ${g.color}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              padding: 26,
            }}
          >
            <span className="float-y" style={{ fontSize: 64, lineHeight: 1 }}>
              {g.emoji}
            </span>
            <span style={{ fontSize: 30, fontWeight: 900 }}>{g.name}</span>
            <span className="hint-text" style={{ textAlign: 'center' }}>
              {g.subtitle}
            </span>
          </button>
        ))}
      </div>

      <h2 style={{ margin: '30px 0 14px', fontSize: 28, color: '#8a8299' }}>
        🌈 即将推出
      </h2>
      <div
        style={{
          display: 'flex',
          gap: 18,
          flexWrap: 'wrap',
          justifyContent: 'center',
          width: '100%',
          maxWidth: 1060,
          marginBottom: 10,
        }}
      >
        {COMING_SOON.map((c) => (
          <div
            key={c.name}
            style={{
              background: 'rgba(255,255,255,0.65)',
              border: '3px dashed rgba(43,33,64,0.15)',
              borderRadius: 22,
              padding: '16px 26px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              opacity: 0.85,
            }}
          >
            <span style={{ fontSize: 40, filter: 'grayscale(0.4)' }}>{c.emoji}</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#8a8299' }}>{c.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
