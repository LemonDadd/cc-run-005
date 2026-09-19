// 基础形状 SVG，供“图形配对”等游戏使用
export type ShapeKind = 'circle' | 'square' | 'triangle' | 'star' | 'heart' | 'hexagon' | 'diamond'

export const SHAPE_KINDS: ShapeKind[] = [
  'circle',
  'square',
  'triangle',
  'star',
  'heart',
  'hexagon',
  'diamond',
]

interface ShapeProps {
  kind: ShapeKind
  color: string
  size?: number
  stroke?: boolean
}

export function ShapeSvg({ kind, color, size = 80, stroke = true }: ShapeProps) {
  const common = {
    fill: color,
    stroke: stroke ? 'rgba(43,33,64,0.25)' : 'none',
    strokeWidth: 4,
    strokeLinejoin: 'round' as const,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {kind === 'circle' && <circle cx="50" cy="50" r="40" {...common} />}
      {kind === 'square' && <rect x="12" y="12" width="76" height="76" rx="14" {...common} />}
      {kind === 'triangle' && <path d="M50 10 L90 84 L10 84 Z" {...common} />}
      {kind === 'star' && (
        <path
          d="M50 6 L62 38 L96 39 L69 59 L79 92 L50 72 L21 92 L31 59 L4 39 L38 38 Z"
          {...common}
        />
      )}
      {kind === 'heart' && (
        <path
          d="M50 88 C20 66 8 48 8 32 C8 18 19 10 31 10 C40 10 47 16 50 23 C53 16 60 10 69 10 C81 10 92 18 92 32 C92 48 80 66 50 88 Z"
          {...common}
        />
      )}
      {kind === 'hexagon' && (
        <path d="M50 8 L87 29 L87 71 L50 92 L13 71 L13 29 Z" {...common} />
      )}
      {kind === 'diamond' && <path d="M50 6 L90 50 L50 94 L10 50 Z" {...common} />}
    </svg>
  )
}

/** 星星图标 */
export function StarIcon({ size = 30, filled = true }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.9l-5.81 3.05 1.11-6.47-4.7-4.58 6.5-.95z"
        fill={filled ? '#ffc93c' : '#d9d3e6'}
        stroke={filled ? '#e0a800' : 'rgba(43,33,64,0.15)'}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** 小鱼（数数捕鱼） */
export function FishSvg({ size = 72, color = '#2ea8e6' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <path
        d="M8 50 C20 26 52 18 70 32 C78 26 86 20 92 18 C89 28 86 36 82 42 C90 50 92 62 90 70 C82 64 74 58 68 60 C54 80 20 76 8 50 Z"
        fill={color}
        stroke="rgba(43,33,64,0.2)"
        strokeWidth="3"
      />
      <circle cx="28" cy="44" r="6" fill="#fff" />
      <circle cx="26" cy="43" r="3" fill="#2b2140" />
      <path d="M46 40 Q56 50 46 60" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/** 水果（比较大小 & 果园应用题） */
const FRUIT_PATHS: Record<string, { body: JSX.Element; leaf?: JSX.Element }> = {
  apple: {
    body: (
      <>
        <path
          d="M50 30 C40 16 18 22 16 50 C14 74 34 90 50 86 C66 90 86 74 84 50 C82 22 60 16 50 30 Z"
          fill="#ef5b5b"
          stroke="rgba(43,33,64,0.18)"
          strokeWidth="3"
        />
        <path d="M50 30 C50 22 52 14 58 10" stroke="#7a4a1e" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M58 12 C66 6 74 10 72 18 C64 20 58 18 58 12 Z" fill="#46b65c" />
      </>
    ),
  },
  pear: {
    body: (
      <path
        d="M54 14 C42 14 40 28 46 36 C28 40 20 60 30 76 C40 92 64 90 72 74 C80 58 70 40 56 36 C60 28 58 16 54 14 Z"
        fill="#9bd34a"
        stroke="rgba(43,33,64,0.18)"
        strokeWidth="3"
      />
    ),
  },
  orange: {
    body: (
      <>
        <circle cx="50" cy="54" r="36" fill="#ff9f43" stroke="rgba(43,33,64,0.18)" strokeWidth="3" />
        <path d="M50 18 C52 12 58 10 62 12" stroke="#46b65c" strokeWidth="5" fill="none" strokeLinecap="round" />
      </>
    ),
  },
  strawberry: {
    body: (
      <path
        d="M50 90 C24 70 22 40 30 30 C40 36 60 36 70 30 C78 40 76 70 50 90 Z"
        fill="#ef5b5b"
        stroke="rgba(43,33,64,0.18)"
        strokeWidth="3"
      />
    ),
  },
}

export function FruitSvg({ kind, size = 56 }: { kind: string; size?: number }) {
  const f = FRUIT_PATHS[kind] ?? FRUIT_PATHS.apple
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {f.body}
      {(kind === 'strawberry') && (
        <>
          <path d="M30 30 L38 20 L46 28 L50 18 L56 28 L64 20 L70 30 Z" fill="#46b65c" />
          {[
            [40, 50],
            [56, 48],
            [48, 62],
            [60, 66],
            [38, 70],
          ].map(([x, y], i) => (
            <ellipse key={i} cx={x} cy={y} rx="2.2" ry="3.2" fill="#ffe3a3" />
          ))}
        </>
      )}
      {kind === 'pear' && (
        <path d="M50 16 C52 8 58 8 60 12" stroke="#7a4a1e" strokeWidth="4" fill="none" strokeLinecap="round" />
      )}
    </svg>
  )
}
