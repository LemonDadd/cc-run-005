// 数数捕鱼：点击游过的小鱼计数，再从 3 个数字中选出总数。
import { useMemo, useState } from 'react'
import { FishSvg } from '../../assets/svgs/Shapes'
import { GameShell, type QuestionContext } from '../common/GameShell'
import { questionCount } from '../../constants/games'
import { useApp } from '../../lib/store'
import { effectiveLevel } from '../../utils/date'
import { makeRng, randInt } from '../../utils/random'
import { genCountingQuestion, type CountingQuestion } from './game'
import { sfxClick } from '../../utils/sound'

function FishField({ q, questionKey, onTapFish }: { q: CountingQuestion; questionKey: number; onTapFish: () => void }) {
  const rng = useMemo(() => makeRng(questionKey + 7), [questionKey])
  const fishLayout = useMemo(
    () =>
      q.colors.map((_, i) => ({
        top: 8 + randInt(0, 68, makeRng(questionKey * 31 + i * 7)),
        delay: -randInt(0, Math.round(q.durationSec * 10), rng) / 2,
        size: 58 + randInt(0, 26, makeRng(questionKey * 17 + i)),
        wave: randInt(-36, 36, makeRng(questionKey * 23 + i)),
      })),
    [q, questionKey, rng],
  )

  return (
    <div
      style={{
        position: 'relative',
        height: 'min(42vh, 360px)',
        borderRadius: 28,
        background: 'linear-gradient(180deg, #bfe9ff 0%, #7cc7ef 55%, #4aa8dc 100%)',
        overflow: 'hidden',
        boxShadow: 'inset 0 -10px 0 rgba(30,110,170,0.25)',
      }}
    >
      {[12, 78, 46].map((x, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            bottom: 0,
            left: `${x}%`,
            fontSize: 54,
            animation: 'bob 2.6s ease-in-out infinite',
            animationDelay: `${i * 0.5}s`,
          }}
        >
          🌿
        </div>
      ))}
      {q.colors.map((color, i) => (
        <SingleFish
          key={`${questionKey}-${i}`}
          color={color}
          duration={q.durationSec}
          layout={fishLayout[i]}
          onTap={onTapFish}
        />
      ))}
    </div>
  )
}

function SingleFish({
  color,
  duration,
  layout,
  onTap,
}: {
  color: string
  duration: number
  layout: { top: number; delay: number; size: number; wave: number }
  onTap: () => void
}) {
  const [caught, setCaught] = useState(false)
  return (
    <div
      className={`fish ${caught ? 'caught' : ''}`}
      style={
        {
          top: `${layout.top}%`,
          animationDuration: `${duration}s`,
          animationDelay: `${layout.delay}s`,
          '--wave': `${layout.wave}px`,
        } as React.CSSProperties
      }
      onPointerDown={() => {
        if (caught) return
        setCaught(true)
        onTap()
      }}
      aria-label="小鱼"
    >
      <FishSvg size={layout.size} color={color} />
    </div>
  )
}

function QuestionView({ ctx, q }: { ctx: QuestionContext; q: CountingQuestion }) {
  const [tapped, setTapped] = useState(0)
  const allCaught = tapped >= q.fishCount

  const tapFish = () => {
    setTapped((t) => Math.min(t + 1, q.fishCount))
    sfxClick()
  }

  const choose = (n: number) => (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    ctx.report(n === q.fishCount, r.left + r.width / 2, r.top + r.height / 2)
  }

  return (
    <div style={{ width: 'min(960px, 94vw)', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <p className="question-text">
        🐟 点一点游过的小鱼，数一数一共有几条？
        <span
          style={{
            marginLeft: 14,
            display: 'inline-flex',
            gap: 6,
            alignItems: 'center',
            color: '#2ea8e6',
          }}
        >
          已数到 <span style={{ fontSize: 44 }}>{tapped}</span> 条
        </span>
      </p>

      <FishField q={q} questionKey={ctx.questionKey + ctx.index * 1000} onTapFish={tapFish} />

      <p className="hint-text" style={{ textAlign: 'center', minHeight: 30 }}>
        {allCaught ? '全部小鱼都数过啦，选出总数吧！' : '继续点一点还在游的小鱼～'}
      </p>

      <div style={{ display: 'flex', gap: 22, justifyContent: 'center', flexWrap: 'wrap' }}>
        {q.choices.map((n) => (
          <button
            key={n}
            className={`answer-number ${ctx.feedback === 'correct' && n === q.fishCount ? 'selected-correct' : ''} ${ctx.feedback === 'wrong' ? 'shake' : ''}`}
            onClick={choose(n)}
            disabled={ctx.feedback === 'correct'}
            style={{ minWidth: 130, background: n === tapped ? '#fff4d6' : '#fff' }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

export function CountingGame() {
  const current = useApp((s) => s.current)
  const level = current ? effectiveLevel(current.birthday, current.level_override) : 1
  const questions = useMemo(
    () =>
      Array.from({ length: questionCount(level) }, (_, i) => genCountingQuestion(level, i)),
    [level],
  )
  return (
    <GameShell
      gameType="counting"
      renderQuestion={(ctx) => <QuestionView key={ctx.questionKey} ctx={ctx} q={questions[ctx.index]} />}
      speakQuestion={() => '数一数，水里一共有几条鱼呢？'}
    />
  )
}
