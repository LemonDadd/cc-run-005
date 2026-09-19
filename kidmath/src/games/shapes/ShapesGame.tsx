// 图形配对：把图形拖回形状相同的“家”；高等级同时要求颜色匹配。
import { useMemo, useRef, useState } from 'react'
import { SHAPE_KINDS, ShapeSvg, type ShapeKind } from '../../assets/svgs/Shapes'
import { GameShell, type QuestionContext } from '../common/GameShell'
import { useDraggable } from '../../hooks/useDraggable'
import { makeRng, shuffle } from '../../utils/random'

const COLORS = ['#ef5b5b', '#2ea8e6', '#ffc93c', '#46b65c', '#8b6fd6', '#ff8a3d']

interface ShapeItem {
  uid: number
  kind: ShapeKind
  color: string
}
interface Slot {
  uid: number
  kind: ShapeKind
  color: string | null // null = 只匹配形状（低等级）
}

interface Board {
  items: ShapeItem[]
  slots: Slot[]
  matchColor: boolean
}

/** 等级：形状数量与是否要求颜色 */
const CONF: { count: number; color: boolean }[] = [
  { count: 3, color: false },
  { count: 4, color: false },
  { count: 4, color: true },
  { count: 5, color: true },
  { count: 6, color: true },
]

function genBoard(level: number, round: number): Board {
  const rng = makeRng(level * 400 + round * 97 + Math.floor(Math.random() * 99900))
  const conf = CONF[Math.min(level - 1, 4)]
  const kinds = shuffle(SHAPE_KINDS, rng).slice(0, conf.count)
  const slots: Slot[] = kinds.map((kind, i) => ({
    uid: i,
    kind,
    color: conf.color ? COLORS[i % COLORS.length] : null,
  }))
  // 高等级时颜色与形状交叉，避免按顺序摆放
  const colors = conf.color
    ? shuffle(
        slots.map((s) => s.color as string),
        rng,
      )
    : slots.map(() => '#2ea8e6')
  const items: ShapeItem[] = shuffle(
    slots.map((s, i) => ({ uid: s.uid, kind: s.kind, color: conf.color ? colors[i] : COLORS[i % 4] })),
    rng,
  )
  return { items, slots: shuffle(slots, rng), matchColor: conf.color }
}

function QuestionView({ ctx }: { ctx: QuestionContext }) {
  const board = useMemo(
    () => genBoard(ctx.level, ctx.index),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ctx.questionKey],
  )
  const [placed, setPlaced] = useState<Record<number, number>>({}) // slotUid -> itemUid
  const [wrongSlot, setWrongSlot] = useState<number | null>(null)
  const [hoverSlot, setHoverSlot] = useState<number | null>(null)
  const slotRefs = useRef(new Map<number, HTMLDivElement | null>())
  const done = Object.keys(placed).length === board.slots.length

  const handlePlaced = (itemUid: number, slotUid: number) => {
    const next = { ...placed, [slotUid]: itemUid }
    setPlaced(next)
    if (Object.keys(next).length === board.slots.length) {
      window.setTimeout(() => {
        const el = slotRefs.current.get(slotUid)
        const r = el?.getBoundingClientRect()
        ctx.report(true, r ? r.left + r.width / 2 : window.innerWidth / 2, r ? r.top + r.height / 2 : 300)
      }, 220)
    }
  }

  const handleWrong = (slotUid: number | null, x: number, y: number) => {
    if (slotUid !== null) {
      setWrongSlot(slotUid)
      window.setTimeout(() => setWrongSlot((cur) => (cur === slotUid ? null : cur)), 450)
    }
    ctx.report(false, x, y)
  }

  return (
    <div style={{ width: 'min(920px, 95vw)', display: 'flex', flexDirection: 'column', gap: 30 }}>
      <p className="question-text">
        {board.matchColor
          ? '🎨 形状和颜色都一样的才是它的家哦，拖一拖吧！'
          : '🏠 把图形拖到形状一样的家里吧！'}
      </p>

      {/* 放置槽（家） */}
      <div
        style={{
          display: 'flex',
          gap: 22,
          justifyContent: 'center',
          flexWrap: 'wrap',
          minHeight: 150,
          padding: 22,
          background: 'rgba(255,255,255,0.7)',
          borderRadius: 28,
        }}
      >
        {board.slots.map((slot) => {
          const itemUid = placed[slot.uid]
          const item = board.items.find((it) => it.uid === itemUid)
          return (
            <div
              key={slot.uid}
              ref={(el) => {
                slotRefs.current.set(slot.uid, el)
              }}
              className={`drop-slot ${item ? 'filled' : ''} ${
                wrongSlot === slot.uid ? 'wrong-soft' : ''
              } ${hoverSlot === slot.uid ? 'hover' : ''}`}
              style={{
                width: 110,
                height: 110,
                borderRadius: 24,
                border: `5px dashed ${slot.color ?? 'rgba(43,33,64,0.3)'}`,
                background: item ? 'rgba(70,182,92,0.12)' : 'rgba(255,255,255,0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {item ? (
                <span className="pop-in">
                  <ShapeSvg kind={item.kind} color={item.color} size={88} />
                </span>
              ) : (
                <ShapeSvg kind={slot.kind} color="#d8d2e6" size={70} stroke={false} />
              )}
            </div>
          )
        })}
      </div>

      {/* 待拖图形托盘 */}
      <div
        style={{
          display: 'flex',
          gap: 26,
          justifyContent: 'center',
          flexWrap: 'wrap',
          padding: 22,
          background: '#fff',
          borderRadius: 28,
          boxShadow: '0 8px 0 rgba(43,33,64,0.06)',
          minHeight: 140,
        }}
      >
        {board.items
          .filter((it) => !Object.values(placed).includes(it.uid))
          .map((item) => (
            <DraggableShapeBoard
              key={item.uid}
              item={item}
              board={board}
              ctx={ctx}
              slotRefs={slotRefs}
              filledSlots={new Set(Object.keys(placed).map(Number))}
              disabled={done || ctx.feedback === 'correct'}
              onPlaced={handlePlaced}
              onWrong={handleWrong}
              onHover={setHoverSlot}
            />
          ))}
      </div>
    </div>
  )
}

/** 单个可拖图形（带本题 board 闭包） */
function DraggableShapeBoard({
  item,
  board,
  ctx,
  slotRefs,
  filledSlots,
  disabled,
  onPlaced,
  onWrong,
  onHover,
}: {
  item: ShapeItem
  board: Board
  ctx: QuestionContext
  slotRefs: React.MutableRefObject<Map<number, HTMLDivElement | null>>
  filledSlots: Set<number>
  disabled: boolean
  onPlaced: (itemUid: number, slotUid: number) => void
  onWrong: (slotUid: number | null, x: number, y: number) => void
  onHover: (slotUid: number | null) => void
}) {
  const hitTest = (x: number, y: number): string | null => {
    let found: string | null = null
    for (const [slotUid, el] of slotRefs.current.entries()) {
      if (!el || filledSlots.has(slotUid)) continue
      const r = el.getBoundingClientRect()
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        found = String(slotUid)
      }
    }
    onHover(found === null ? null : Number(found))
    return found
  }

  const drag = useDraggable({
    id: `shape-${item.uid}`,
    hitTest,
    disabled,
    onDrop: (slotId) => {
      onHover(null)
      const slotUid = Number(slotId)
      const slot = board.slots.find((s) => s.uid === slotUid)
      const okColor = !board.matchColor || slot?.color === item.color
      if (slot && slot.kind === item.kind && okColor) {
        onPlaced(item.uid, slotUid)
        return true
      }
      const el = slotRefs.current.get(slotUid)
      const r = el?.getBoundingClientRect()
      onWrong(
        slot && slot.kind !== item.kind ? slotUid : null,
        r ? r.left + r.width / 2 : window.innerWidth / 2,
        r ? r.top + r.height / 2 : 200,
      )
      return false
    },
    onSnapBack: () => onHover(null),
  })

  return (
    <div
      ref={drag.ref}
      className={`draggable ${drag.dragging ? 'dragging' : ''}`}
      style={{ ...drag.style, touchAction: 'none' }}
      {...drag.dragProps}
    >
      <ShapeSvg kind={item.kind} color={item.color} size={86} />
    </div>
  )
}

export function ShapesGame() {
  return (
    <GameShell
      gameType="shapes"
      renderQuestion={(ctx) => <QuestionView key={ctx.questionKey} ctx={ctx} />}
      speakQuestion={() => '看一看，把图形拖到形状一样的家里吧！'}
    />
  )
}
