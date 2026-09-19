// 时钟 SVG：支持整点与半点，供“认时钟”游戏使用
interface ClockProps {
  hour: number // 0-23，内部转 12 小时
  half?: boolean // true = 分针指向 6
  size?: number
  highlight?: boolean
}

export function ClockSvg({ hour, half = false, size = 180, highlight = false }: ClockProps) {
  const h = ((hour % 12) + 12) % 12
  const minuteAngle = half ? 180 : 0
  // 时针：半点时位于两个数字中间
  const hourAngle = (h + (half ? 0.5 : 0)) * 30

  return (
    <svg width={size} height={size} viewBox="0 0 200 200">
      <circle
        cx="100"
        cy="100"
        r="92"
        fill={highlight ? '#e7f8ea' : '#fffdf5'}
        stroke={highlight ? '#46b65c' : '#e8dcc3'}
        strokeWidth={highlight ? 8 : 6}
      />
      {Array.from({ length: 12 }, (_, i) => {
        const n = i + 1
        const a = (n * 30 - 90) * (Math.PI / 180)
        const x = 100 + Math.cos(a) * 72
        const y = 100 + Math.sin(a) * 72 + 8
        return (
          <text
            key={n}
            x={x}
            y={y}
            textAnchor="middle"
            fontSize="20"
            fontWeight="800"
            fill="#5a4f7a"
          >
            {n}
          </text>
        )
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 - 90) * (Math.PI / 180)
        return (
          <line
            key={i}
            x1={100 + Math.cos(a) * 84}
            y1={100 + Math.sin(a) * 84}
            x2={100 + Math.cos(a) * 88}
            y2={100 + Math.sin(a) * 88}
            stroke="#8a7faa"
            strokeWidth="3"
            strokeLinecap="round"
          />
        )
      })}
      {/* 时针 */}
      <g transform={`rotate(${hourAngle} 100 100)`}>
        <line
          x1="100"
          y1="108"
          x2="100"
          y2="58"
          stroke="#2b2140"
          strokeWidth="9"
          strokeLinecap="round"
        />
      </g>
      {/* 分针 */}
      <g transform={`rotate(${minuteAngle} 100 100)`}>
        <line
          x1="100"
          y1="110"
          x2="100"
          y2="38"
          stroke="#2ea8e6"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </g>
      <circle cx="100" cy="100" r="8" fill="#ff8a3d" stroke="#fff" strokeWidth="2.5" />
    </svg>
  )
}

/** 整点/半点的中文读法，用于 TTS 读题 */
export function clockLabel(hour: number, half?: boolean): string {
  const h = ((hour % 24) + 24) % 24
  if (half) return `${h}点半`
  return `${h}点整`
}
