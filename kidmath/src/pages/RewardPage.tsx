// /reward 奖励结算：星星（100% 两颗、≥80% 一颗）、正确率、新成就、新饰品，全程正向文案
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ACHIEVEMENT_MAP, ITEM_CATALOG } from '../constants/games'
import { useApp } from '../lib/store'
import { sfxDone } from '../utils/sound'
import { StarIcon } from '../assets/svgs/Shapes'

export function RewardPage() {
  const navigate = useNavigate()
  const reward = useApp((s) => s.reward)
  const clearReward = useApp((s) => s.clearReward)
  const current = useApp((s) => s.current)

  useEffect(() => {
    if (!reward) navigate('/home', { replace: true })
    sfxDone()
  }, [reward, navigate])

  if (!reward) return null
  const { result, total, correct, gameName } = reward
  const pct = Math.round((correct / total) * 100)
  const praise =
    result.stars_earned >= 2
      ? '全部答对，太厉害啦！'
      : result.stars_earned === 1
        ? '表现真棒，继续加油！'
        : '勇敢尝试，下一次会更好！'

  return (
    <div
      className="page scroll-area"
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'linear-gradient(170deg, #fff8e0 0%, #e6f6ff 100%)',
      }}
    >
      <div className="card pop-in" style={{ width: 'min(680px, 95vw)', textAlign: 'center' }}>
        <p className="hint-text" style={{ fontSize: 24 }}>
          {gameName} · 本轮完成
        </p>
        <h1 style={{ fontSize: 46, margin: '8px 0 6px' }}>{praise}</h1>

        <div style={{ display: 'flex', gap: 18, justifyContent: 'center', margin: '18px 0 8px' }}>
          {[0, 1].map((i) => (
            <span
              key={i}
              className="star-award"
              style={{ animationDelay: `${0.25 + i * 0.35}s`, opacity: i < result.stars_earned ? 1 : 0.25 }}
            >
              <StarIcon size={i < result.stars_earned ? 110 : 92} filled={i < result.stars_earned} />
            </span>
          ))}
        </div>

        <p style={{ fontSize: 30, fontWeight: 800, margin: '6px 0 2px' }}>
          答对 {correct} / {total} 题 · 正确率 {pct}%
        </p>
        <p className="hint-text" style={{ fontSize: 24 }}>
          本轮获得 ⭐ ×{result.stars_earned}
          {current ? `，累计星星 ${result.stars_total} 颗` : ''}
        </p>

        {result.newly_unlocked_items.length > 0 && (
          <div
            className="pop-in"
            style={{
              marginTop: 20,
              background: 'linear-gradient(135deg,#fff3c4,#ffe0a3)',
              borderRadius: 22,
              padding: 18,
              border: '3px solid #ffc93c',
            }}
          >
            <h3 style={{ fontSize: 26 }}>🎁 解锁新饰品！</h3>
            <div style={{ display: 'flex', gap: 18, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
              {result.newly_unlocked_items.map((id) => {
                const item = ITEM_CATALOG.find((x) => x.id === id)
                return (
                  <div key={id} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 52 }}>{item?.emoji ?? '🎁'}</div>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{item?.name ?? id}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {result.new_achievements.length > 0 && (
          <div
            className="pop-in"
            style={{ marginTop: 16, background: '#eef0ff', borderRadius: 22, padding: 16 }}
          >
            <h3 style={{ fontSize: 26 }}>🏅 获得新徽章！</h3>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
              {result.new_achievements.map((a) => {
                const def = ACHIEVEMENT_MAP[a.code]
                return (
                  <div key={a.code} style={{ textAlign: 'center', maxWidth: 150 }}>
                    <div style={{ fontSize: 48 }}>{def?.emoji ?? '🏅'}</div>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{def?.name ?? a.code}</div>
                    <div className="hint-text" style={{ fontSize: 18 }}>{def?.desc}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 26, flexWrap: 'wrap' }}>
          <button
            className="big-btn blue"
            onClick={() => {
              clearReward()
              navigate(`/game/${result.record.game_type}`, { replace: true })
            }}
          >
            🔁 再玩一次
          </button>
          <button
            className="big-btn purple"
            onClick={() => {
              clearReward()
              navigate('/gallery')
            }}
          >
            🎩 去装扮
          </button>
          <button
            className="big-btn green"
            onClick={() => {
              clearReward()
              navigate('/home')
            }}
          >
            🏠 回到首页
          </button>
        </div>

        <p className="hint-text" style={{ marginTop: 18 }}>
          答错没关系，可以一直试到会哦～
        </p>
      </div>
    </div>
  )
}
