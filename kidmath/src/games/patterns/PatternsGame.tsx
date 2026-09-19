// 规律排序：观察 ABAB / ABC 等规律，把正确图案拖进空位补全序列。
import { useMemo, useRef, useState } from 'react'
import { ShapeSvg, type ShapeKind } from '../../assets/svgs/Shapes'
import { GameShell, type QuestionContext } from '../common/GameShell'
import { useDraggable } from '../../hooks/useDraggable'
import { makeRng, shuffle } from '../../utils/random'

type Sym = { kind: ShapeKind; color: string }

interface PatternBoard {
  /** 完整规律序列的符号（循环单元重复到所需长度） */
  sequence: Sym[]
  /** 哪些位置是空位（需要拖入） */
  blanks: number[]
  /** 托盘里的图块（含干扰项） */
  tray: { uid: number; sym: Sym }[]
  speak: string
}

const PALETTE: Sym[] = [
  { kind: 'circle', color: '#ef5b5b' },
  { kind: 'square', color: '#2ea8e6' },
  { kind: 'triangle', color: '#46b65c' },
  { kind: 'star', color: '#ffc93c' },
  { kind: 'heart', color: '#e8568f' },
  { kind: 'hexagon', color: '#8b6fd6' },
]

interface Conf {
  unit: number // 循环单元长度
  len: number // 序列总长
  blanks: number
  distractors: number
  unitPatterns?: number[][] // 可选：固定单元（用符号索引），null 表示取前 unit 个
}

const CONFS: Conf[] = [
  { unit: 2, len: 6, blanks: 1, distractors: 1 }, // ABAB
  { unit: 2, len: 8, blanks: 1, distractors: 2 }, // ABAB 更长
  { unit: 3, len: 9, blanks: 2, distractors: 1 }, // ABC
  { unit: 4, len: 8, blanks: 2, distractors: 2 }, // ABCD
  { unit: 3, len: 9, blanks: 3, distractors: 3 }, // 高难度 + 更多干扰
]

function genPattern(level: number, round: number): PatternBoard {
  const rng = makeRng(level * 500 + round * 89 + Math.floor(Math.random() * 99900))
  const conf = CONFS[Math.min(level - 1, 4)]
  const syms = shuffle(PALETTE, rng).slice(0, conf.unit)
  const unit = syms.map((s, i) => ({ idx: i, sym: s }))
  const sequence: Sym[] = []
  for (let i = 0; i < conf.len; i++) sequence.push(unit[i % conf.unit].sym)

  // 空位放在序列后段，避免首格就是空（低龄儿童更易上手）
  const positions = sequence.map((_, i) => i)
  const late = positions.slice(Math.max(2, conf.len - 4))
  const blanks = shuffle(late, rng).slice(0, conf.blanks).sort((a, b) => a - b)

  const correctTiles = blanks.map((pos, i) => ({ uid: i, sym: sequence[pos] }))
  const usedKinds = new Set(syms.map((s) => s.kind))
  const distractorPool = PALETTE.filter((s) => !usedKinds.has(s.kind))
  const distractors = shuffle(distractorPool, rng)
    .slice(0, conf.distractors)
    .map((sym, i) => ({ uid: 100 + i, sym }))

  const tray = shuffle([...correctTiles, ...distractors], rng)
  const speak =
    conf.unit === 2
      ? '看看规律，下一个应该放什么图案？拖进去吧！'
      : '看看这排图案的规律，把缺少的图案拖进去吧！'

  return { sequence, blanks, tray, speak }
}

function Tile({ sym, size = 72 }: { sym: Sym; size?: number }) {
  return (
    <div
      style={{
        width: size + 18,
        height: size + 18,
        borderRadius: 20,
        background: '#fff',
        boxShadow: '0 4px 0 rgba(43,33,64,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ShapeSvg kind={sym.kind} color={sym.color} size={size} />
    </div>
  )
}

function DraggableTile({
  tile,
  slotRefs,
  filled,
  disabled,
  onTryPlace,
  onHover,
}: {
  tile: { uid: number; sym: Sym }
  slotRefs: React.MutableRefObject<Map<number, HTMLDivElement | null>>
  filled: Set<number>
  disabled: boolean
  /** 校验是否可以放入；返回 true 接受，false 拒绝并回弹（父组件负责播放温和反馈） */
  onTryPlace: (tileUid: number, pos: number, x: number, y: number) => boolean
  onHover: (pos: number | null) => void
}) {
  const hitTest = (x: number, y: number): string | null => {
    let found: string | null = null
    for (const [pos, el] of slotRefs.current.entries()) {
      if (!el || filled.has(pos)) continue
      const r = el.getBoundingClientRect()
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) found = String(pos)
    }
    onHover(found === null ? null : Number(found))
    return found
  }

  const drag = useDraggable({
    id: `tile-${tile.uid}`,
    hitTest,
    disabled,
    onDrop: (slotId) => {
      onHover(null)
      const pos = Number(slotId)
      const el = slotRefs.current.get(pos)
      const r = el?.getBoundingClientRect()
      return onTryPlace(
        tile.uid,
        pos,
        r ? r.left + r.width / 2 : window.innerWidth / 2,
        r ? r.top + r.height / 2 : 300,
      )
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
      <Tile sym={tile.sym} />
    </div>
  )
}

function QuestionView({ ctx }: { ctx: QuestionContext }) {
  const board = useMemo(
    () => genPattern(ctx.level, ctx.index),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ctx.questionKey],
  )
  const blankSet = useMemo(() => new Set(board.blanks), [board])
  // pos -> 放入的图块 uid
  const [placements, setPlacements] = useState<Record<number, number>>({})
  const [wrongPos, setWrongPos] = useState<number | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const slotRefs = useRef(new Map<number, HTMLDivElement | null>())

  const placedTileUids = new Set(Object.values(placements))
  const allFilled = board.blanks.every((p) => placements[p] !== undefined)

  const handleTryPlace = (tileUid: number, pos: number, x: number, y: number): boolean => {
    const tile = board.tray.find((t) => t.uid === tileUid)
    if (!tile || !blankSet.has(pos)) return false
    const expected = board.sequence[pos]
    if (tile.sym.kind === expected.kind && tile.sym.color === expected.color) {
      const next = { ...placements, [pos]: tileUid }
      setPlacements(next)
      setWrongPos(null)
      if (board.blanks.every((p) => next[p] !== undefined)) {
        window.setTimeout(() => ctx.report(true, x, y), 220)
      }
      return true
    }
    // 放错：轻微抖动后回弹，不惩罚
    setWrongPos(pos)
    ctx.report(false, x, y)
    window.setTimeout(() => setWrongPos(null), 450)
    return false
  }

  return (
    <div style={{ width: 'min(960px, 95vw)', display: 'flex', flexDirection: 'column', gap: 34 }}>
      <p className="question-text">🧩 {board.speak}</p>

      {/* 规律序列 */}
      <div
        style={{
          display: 'flex',
          gap: 14,
          justifyContent: 'center',
          flexWrap: 'wrap',
          padding: 26,
          background: 'rgba(255,255,255,0.75)',
          borderRadius: 28,
        }}
      >
        {board.sequence.map((sym, pos) => {
          if (!blankSet.has(pos)) {
            return (
              <span key={pos} className="pop-in" style={{ animationDelay: `${pos * 50}ms` }}>
                <Tile sym={sym} />
              </span>
            )
          }
          const tileUid = placements[pos]
          const placedTile = board.tray.find((t) => t.uid === tileUid)
          return (
            <div
              key={pos}
              ref={(el) => {
                slotRefs.current.set(pos, el)
              }}
              className={`drop-slot ${placedTile ? 'filled' : ''} ${wrongPos === pos ? 'wrong-soft' : ''} ${
                hover === pos ? 'hover' : ''
              }`}
              style={{
                width: 90,
                height: 90,
                borderRadius: 20,
                border: '5px dashed rgba(43,33,64,0.3)',
                background: placedTile ? 'rgba(70,182,92,0.12)' : 'rgba(255,255,255,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {placedTile ? (
                <span className="pop-in">
                  <ShapeSvg kind={placedTile.sym.kind} color={placedTile.sym.color} size={68} />
                </span>
              ) : (
                <span style={{ fontSize: 40, color: '#b9b0c6' }}>?</span>
              )}
            </div>
          )
        })}
      </div>

      {/* 候选图块托盘 */}
      <div
        style={{
          display: 'flex',
          gap: 22,
          justifyContent: 'center',
          flexWrap: 'wrap',
          padding: 22,
          background: '#fff',
          borderRadius: 28,
          boxShadow: '0 8px 0 rgba(43,33,64,0.06)',
          minHeight: 120,
        }}
      >
        {board.tray
          .filter((t) => !placedTileUids.has(t.uid))
          .map((tile) => (
            <DraggableTile
              key={tile.uid}
              tile={tile}
              slotRefs={slotRefs}
              filled={new Set(Object.keys(placements).map(Number))}
              disabled={allFilled || ctx.feedback === 'correct'}
              onTryPlace={handleTryPlace}
              onHover={setHover}
            />
          ))}
      </div>
    </div>
  )
}

export function PatternsGame() {
  return (
    <GameShell
      gameType="patterns"
      renderQuestion={(ctx) => <QuestionView key={ctx.questionKey} ctx={ctx} />}
      speakQuestion={() => '看看图案排列的规律，把缺少的图案拖进去吧！'}
    />
  )
}
