// /gallery 饰品图鉴与装扮：按槽位展示已解锁饰品，点击穿戴/脱下；未解锁显示下一颗星进度。
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AvatarSvg } from '../assets/svgs/AvatarSvg'
import { ITEM_CATALOG, STARS_PER_ITEM } from '../constants/games'
import { db } from '../lib/db'
import { useApp } from '../lib/store'
import type { EquippedItem, ItemSlot } from '../types'
import { sfxClick } from '../utils/sound'
import { TopBar } from '../components/TopBar'

const SLOT_NAMES: Record<ItemSlot, string> = {
  hat: '🎩 帽子',
  glasses: '🕶️ 眼镜',
  background: '🌈 背景',
  pet: '🐶 小伙伴',
}
const SLOT_ORDER: ItemSlot[] = ['hat', 'glasses', 'background', 'pet']

export function GalleryPage() {
  const navigate = useNavigate()
  const current = useApp((s) => s.current)
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set())
  const [equipped, setEquipped] = useState<Record<ItemSlot, string | null>>({
    hat: null,
    glasses: null,
    background: null,
    pet: null,
  })

  useEffect(() => {
    if (!current) {
      navigate('/', { replace: true })
      return
    }
    void db.getInventory(current.id).then((inv) => {
      setUnlockedIds(new Set(inv.unlocked.map((u) => u.itemId)))
      const next = { hat: null, glasses: null, background: null, pet: null } as Record<
        ItemSlot,
        string | null
      >
      for (const e of inv.equipped as EquippedItem[]) next[e.slot] = e.item_id
      setEquipped(next)
    })
  }, [current, navigate])

  const nextUnlockAt = unlockedIds.size * STARS_PER_ITEM
  const progress = current
    ? Math.min(1, (current.stars_total % STARS_PER_ITEM) / STARS_PER_ITEM)
    : 0

  const equip = async (slot: ItemSlot, itemId: string | null) => {
    if (!current) return
    sfxClick()
    const rows = await db.equipItem(current.id, slot, itemId)
    const next = { hat: null, glasses: null, background: null, pet: null } as Record<
      ItemSlot,
      string | null
    >
    for (const e of rows) next[e.slot] = e.item_id
    setEquipped(next)
  }

  const grouped = useMemo(() => {
    const map = new Map<ItemSlot, typeof ITEM_CATALOG>()
    for (const slot of SLOT_ORDER) map.set(slot, ITEM_CATALOG.filter((i) => i.slot === slot))
    return map
  }, [])

  if (!current) return null

  return (
    <div className="page">
      <TopBar title="饰品图鉴 & 装扮" onBack={() => navigate('/home')} />
      <div className="center-wrap" style={{ alignItems: 'flex-start' }}>
        <div style={{ width: 'min(1040px, 96vw)' }}>
          <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap', justifyContent: 'center' }}>
            <div
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                minWidth: 280,
              }}
            >
              <AvatarSvg avatar={current.avatar} size={200} equipped={equipped} />
              <h2 style={{ fontSize: 30 }}>{current.nickname}</h2>
              <div className="star-chip">⭐ {current.stars_total}</div>
              <div style={{ width: '100%' }}>
                <p className="hint-text" style={{ marginBottom: 6 }}>
                  {unlockedIds.size < ITEM_CATALOG.length
                    ? `再得 ${STARS_PER_ITEM - (current.stars_total % STARS_PER_ITEM)} 颗星解锁下一个饰品（${nextUnlockAt}⭐）`
                    : '所有饰品都集齐啦！'}
                </p>
                <div style={{ height: 18, borderRadius: 999, background: '#eae3f5', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${(unlockedIds.size >= ITEM_CATALOG.length ? 1 : progress) * 100}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg,#ffc93c,#ff8a3d)',
                      transition: 'width .4s ease',
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 320, display: 'flex', flexDirection: 'column', gap: 18 }}>
              {SLOT_ORDER.map((slot) => (
                <div key={slot} className="card" style={{ padding: 18 }}>
                  <h3 style={{ fontSize: 24, marginBottom: 12 }}>{SLOT_NAMES[slot]}</h3>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {grouped.get(slot)!.map((item) => {
                      const owned = unlockedIds.has(item.id)
                      const on = equipped[slot] === item.id
                      return (
                        <button
                          key={item.id}
                          disabled={!owned}
                          onClick={() => void equip(slot, on ? null : item.id)}
                          style={{
                            minWidth: 96,
                            minHeight: 96,
                            borderRadius: 20,
                            border: `4px solid ${on ? '#ff8a3d' : 'rgba(43,33,64,0.12)'}`,
                            background: on ? '#fff1e2' : '#fff',
                            boxShadow: on ? '0 0 0 4px rgba(255,138,61,0.25)' : 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 2,
                            padding: 8,
                            cursor: owned ? 'pointer' : 'default',
                            transition: 'transform .12s ease',
                          }}
                        >
                          <span style={{ fontSize: 40, filter: owned ? 'none' : 'grayscale(1) opacity(0.4)' }}>
                            {owned ? item.emoji : '🔒'}
                          </span>
                          <span style={{ fontSize: 18, fontWeight: 700 }}>
                            {owned ? item.name : '未解锁'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
