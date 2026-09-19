// 答题反馈：答对绿色高亮 + 星星粒子 + 音效/TTS；答错轻微抖动 + 温和提示，不惩罚。
// 所有反馈在用户点击的同一帧触发，确保 500ms 内呈现。
import { useCallback, useRef, useState } from 'react'
import { sfxCorrect, sfxWrong } from '../utils/sound'

export type Feedback = 'idle' | 'correct' | 'wrong'

interface Particle {
  id: number
  x: number
  y: number
  dx: number
  dy: number
  emoji: string
}

const PRAISES = ['答对啦！', '真棒！', '太厉害啦！', '好聪明！']

export function useFeedback() {
  const [feedback, setFeedback] = useState<Feedback>('idle')
  const [particles, setParticles] = useState<Particle[]>([])
  const [praise, setPraise] = useState<string | null>(null)
  const pid = useRef(0)
  const lockRef = useRef(false)

  const celebrate = useCallback((clientX: number, clientY: number) => {
    const cur = PRAISES[Math.floor(Math.random() * PRAISES.length)]
    setPraise(cur)
    window.setTimeout(() => setPraise(null), 900)

    const created: Particle[] = Array.from({ length: 8 }, () => {
      const angle = Math.random() * Math.PI * 2
      const dist = 80 + Math.random() * 90
      return {
        id: pid.current++,
        x: clientX,
        y: clientY,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist - 40,
        emoji: Math.random() < 0.6 ? '⭐' : '✨',
      }
    })
    setParticles((p) => [...p, ...created])
    const ids = new Set(created.map((c) => c.id))
    window.setTimeout(() => {
      setParticles((p) => p.filter((x) => !ids.has(x.id)))
    }, 850)
  }, [])

  /**
   * 处理一次作答。
   * @returns true 表示答对（已锁定，等待父组件进入下一题）；false 表示答错（可重试，不惩罚）
   */
  const answer = useCallback(
    (isCorrect: boolean, x: number, y: number): boolean => {
      if (lockRef.current) return false
      if (isCorrect) {
        lockRef.current = true
        setFeedback('correct')
        sfxCorrect()
        celebrate(x, y)
        return true
      }
      setFeedback('wrong')
      sfxWrong()
      window.setTimeout(() => setFeedback('idle'), 420)
      return false
    },
    [celebrate],
  )

  /** 下一题时重置 */
  const reset = useCallback(() => {
    lockRef.current = false
    setFeedback('idle')
  }, [])

  const locked = lockRef.current

  return { feedback, particles, praise, answer, reset, locked }
}

/** 星星粒子层，挂在页面根部 */
export function ParticleLayer({ particles }: { particles: ReturnType<typeof useFeedback>['particles'] }) {
  return (
    <>
      {particles.map((p) => (
        <span
          key={p.id}
          className="star-particle"
          style={
            {
              left: p.x,
              top: p.y,
              '--dx': `${p.dx}px`,
              '--dy': `${p.dy}px`,
            } as React.CSSProperties
          }
        >
          {p.emoji}
        </span>
      ))}
    </>
  )
}
