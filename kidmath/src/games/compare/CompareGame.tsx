// 比较大小：左右两组物品，点击“更多”的一边。
import { GameShell, type QuestionContext } from '../common/GameShell'
import { questionCount } from '../../constants/games'
import { useApp } from '../../lib/store'
import { effectiveLevel } from '../../utils/date'
import { useMemo } from 'react'
import { FruitSvg } from '../../assets/svgs/Shapes'
import { genCompareQuestion, type CompareQuestion } from './game'

function FruitCluster({ count, fruit }: { count: number; fruit: string }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 60px)',
        gap: 8,
        justifyContent: 'center',
        alignContent: 'center',
        padding: 12,
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="pop-in" style={{ animationDelay: `${i * 40}ms` }}>
          <FruitSvg kind={fruit} size={54} />
        </span>
      ))}
    </div>
  )
}

function QuestionView({ ctx, q }: { ctx: QuestionContext; q: CompareQuestion }) {
  const answerSide = q.left > q.right ? 'left' : 'right'

  const tap = (side: 'left' | 'right') => (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    ctx.report(side === answerSide, r.left + r.width / 2, r.top + r.height / 2)
  }

  const sideStyle = (side: 'left' | 'right'): React.CSSProperties => {
    const isAnswer = side === answerSide
    const base: React.CSSProperties = {
      flex: 1,
      minHeight: 280,
      borderRadius: 28,
      border: '6px solid rgba(43,33,64,0.1)',
      background: '#fff',
      boxShadow: '0 8px 0 rgba(43,33,64,0.08)',
      transition: 'transform .12s ease, border-color .12s ease, background .12s ease',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    }
    if (ctx.feedback === 'correct' && isAnswer)
      return { ...base, borderColor: '#46b65c', background: '#e9f9ec' }
    if (ctx.feedback === 'wrong') return { ...base, animation: 'shake-soft 0.4s ease' }
    return base
  }

  return (
    <div style={{ width: 'min(980px, 95vw)' }}>
      <p className="question-text" style={{ marginBottom: 22 }}>
        看一看，哪边的水果更多？点一点更多的一边 👇
      </p>
      <div style={{ display: 'flex', gap: 26, alignItems: 'stretch' }}>
        <button onClick={tap('left')} disabled={ctx.feedback === 'correct'} style={sideStyle('left')}>
          <FruitCluster count={q.left} fruit={q.leftFruit} />
        </button>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: 56,
            fontWeight: 900,
            color: '#f58634',
          }}
        >
          VS
        </div>
        <button onClick={tap('right')} disabled={ctx.feedback === 'correct'} style={sideStyle('right')}>
          <FruitCluster count={q.right} fruit={q.rightFruit} />
        </button>
      </div>
    </div>
  )
}

export function CompareGame() {
  const current = useApp((s) => s.current)
  const level = current ? effectiveLevel(current.birthday, current.level_override) : 1
  const questions = useMemo(
    () =>
      Array.from({ length: questionCount(level) }, (_, i) => genCompareQuestion(level, i)),
    [level],
  )
  return (
    <GameShell
      gameType="compare"
      renderQuestion={(ctx) => <QuestionView key={ctx.questionKey} ctx={ctx} q={questions[ctx.index]} />}
      speakQuestion={() => '看一看，哪边的水果更多？点一点更多的一边。'}
    />
  )
}
