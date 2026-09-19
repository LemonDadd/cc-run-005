// 根路径：启动 / 选择玩家。无档案时引导创建第一个孩子的档案（首次启动可创建档案）。
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AvatarSvg } from '../assets/svgs/AvatarSvg'
import { AVATARS } from '../constants/games'
import { useApp } from '../lib/store'
import { ageFromBirthday, defaultLevelForAge } from '../utils/date'
import { sfxClick } from '../utils/sound'

export function ProfileSelectPage() {
  const navigate = useNavigate()
  const profiles = useApp((s) => s.profiles)
  const selectProfile = useApp((s) => s.selectProfile)
  const createProfile = useApp((s) => s.createProfile)
  const bootstrap = useApp((s) => s.bootstrap)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  const pick = async (id: number) => {
    sfxClick()
    const p = profiles.find((x) => x.id === id)
    if (!p) return
    await selectProfile(p)
    navigate('/home')
  }

  return (
    <div className="page" style={{ alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', marginBottom: 26 }}>
        <h1 style={{ fontSize: 58, marginBottom: 8 }} className="float-y">
          🧮 KidMath
        </h1>
        <p className="hint-text" style={{ fontSize: 24 }}>
          欢迎来到数学乐园！点一点你的头像开始吧～
        </p>
      </div>

      {!creating && profiles.length === 0 && (
        <div className="card pop-in" style={{ textAlign: 'center', maxWidth: 520 }}>
          <p style={{ fontSize: 26, fontWeight: 800, marginBottom: 18 }}>
            👋 第一次来玩，先给小朋友建一个档案吧！
          </p>
          <button
            className="big-btn"
            onClick={() => {
              sfxClick()
              setCreating(true)
            }}
          >
            ➕ 创建我的档案
          </button>
        </div>
      )}

      {!creating && profiles.length > 0 && (
        <>
          <div
            style={{
              display: 'flex',
              gap: 28,
              flexWrap: 'wrap',
              justifyContent: 'center',
              maxWidth: 900,
              marginBottom: 30,
            }}
          >
            {profiles.map((p) => (
              <button
                key={p.id}
                className="card pop-in"
                onClick={() => void pick(p.id)}
                style={{
                  width: 200,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                  background: '#fff',
                }}
              >
                <span className="float-y">
                  <AvatarSvg avatar={p.avatar} size={120} />
                </span>
                <span style={{ fontSize: 28, fontWeight: 900 }}>{p.nickname}</span>
                <span className="hint-text">{ageFromBirthday(p.birthday)} 岁</span>
                <span className="star-chip">⭐ {p.stars_total}</span>
              </button>
            ))}
            {profiles.length < 6 && (
              <button
                className="card"
                onClick={() => {
                  sfxClick()
                  setCreating(true)
                }}
                style={{
                  width: 200,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  border: '4px dashed rgba(43,33,64,0.2)',
                  background: 'rgba(255,255,255,0.6)',
                  color: '#8a8299',
                }}
              >
                <span style={{ fontSize: 64, lineHeight: 1 }}>＋</span>
                <span style={{ fontSize: 24, fontWeight: 800 }}>添加玩家</span>
              </button>
            )}
          </div>
          <button className="ghost-btn" onClick={() => navigate('/parent')}>
            👪 家长入口
          </button>
        </>
      )}

      {creating && (
        <CreateProfileCard
          onCancel={() => setCreating(false)}
          onCreated={async (nickname, birthday, avatar) => {
            const p = await createProfile(nickname, birthday, avatar)
            await selectProfile(p)
            navigate('/home')
          }}
        />
      )}
    </div>
  )
}

function CreateProfileCard({
  onCreated,
  onCancel,
  initial,
  title = '新建玩家档案',
}: {
  onCreated: (nickname: string, birthday: string, avatar: string) => void | Promise<void>
  onCancel: () => void
  initial?: { nickname: string; birthday: string; avatar: string }
  title?: string
}) {
  const [nickname, setNickname] = useState(initial?.nickname ?? '')
  const [birthday, setBirthday] = useState(
    initial?.birthday ?? (() => {
      const d = new Date()
      d.setFullYear(d.getFullYear() - 4)
      return d.toISOString().slice(0, 10)
    }),
  )
  const [avatar, setAvatar] = useState(initial?.avatar ?? AVATARS[0])
  const [error, setError] = useState('')

  const age = useMemo(() => ageFromBirthday(birthday), [birthday])

  const submit = () => {
    const name = nickname.trim()
    if (!name) {
      setError('给小朋友起个昵称吧～')
      return
    }
    if (name.length > 12) {
      setError('昵称最多 12 个字哦')
      return
    }
    if (!birthday || Number.isNaN(new Date(birthday + 'T00:00:00').getTime())) {
      setError('请选择正确的生日')
      return
    }
    if (age < 1 || age > 12) {
      setError('生日看起来不太对哦（适用 1-12 岁）')
      return
    }
    setError('')
    void onCreated(name, birthday, avatar)
  }

  return (
    <div className="card pop-in" style={{ width: 'min(560px, 94vw)' }}>
      <h2 style={{ fontSize: 32, marginBottom: 18, textAlign: 'center' }}>{title}</h2>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
        <AvatarSvg avatar={avatar} size={130} />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gap: 8,
          marginBottom: 20,
        }}
      >
        {AVATARS.map((a) => (
          <button
            key={a}
            onClick={() => {
              setAvatar(a)
              sfxClick()
            }}
            style={{
              borderRadius: '50%',
              padding: 2,
              background: avatar === a ? '#ffd28a' : 'transparent',
              border: avatar === a ? '3px solid #ff8a3d' : '3px solid transparent',
              transition: 'transform .12s ease',
            }}
            aria-label={`头像 ${a}`}
          >
            <AvatarSvg avatar={a} size={46} />
          </button>
        ))}
      </div>

      <label className="field-label" htmlFor="nickname">
        昵称
      </label>
      <input
        id="nickname"
        className="text-input"
        value={nickname}
        maxLength={12}
        placeholder="例如：小豆豆"
        onChange={(e) => setNickname(e.target.value)}
        style={{ marginBottom: 18 }}
      />

      <label className="field-label" htmlFor="birthday">
        生日（年龄自动计算：{age} 岁，默认 Level {defaultLevelForAge(age)}）
      </label>
      <input
        id="birthday"
        className="text-input"
        type="date"
        value={birthday}
        onChange={(e) => setBirthday(e.target.value)}
        style={{ marginBottom: error ? 8 : 22 }}
      />

      {error && (
        <p style={{ color: '#d55050', fontSize: 20, marginBottom: 12, fontWeight: 700 }}>{error}</p>
      )}

      <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
        <button className="ghost-btn" onClick={onCancel}>
          取消
        </button>
        <button className="big-btn green" onClick={submit}>
          完成 ✓
        </button>
      </div>
    </div>
  )
}

export { CreateProfileCard }
