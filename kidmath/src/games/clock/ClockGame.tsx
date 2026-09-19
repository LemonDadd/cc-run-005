// 认时钟：整点与半点。低等级只认整点，进阶混合整点/半点，高等级看钟选时间。
import { useMemo } from 'react'
import { ClockSvg, clockLabel } from '../../assets/svgs/ClockSvg'
import { GameShell, type QuestionContext } from '../common/GameShell'
import { questionCount } from '../../constants/games'
import { useApp } from '../../lib/store'
import { effectiveLevel } from '../../utils/date'
import { makeRng, randInt, shuffle } from '../../utils/random'

interface ClockQuestion {
  hour: number
  half: boolean
  /** 答案选项（{hour,half} 数组） */
  choices: { hour: number; half: boolean }[]
  /** true=看钟选时间；false（更低龄友好，本版统一看钟选时间，保留字段） */
  pickTime: boolean
}

function sameTime(a: { hour: number; half: boolean }, b: { hour: number; half: boolean }) {
  return a.hour === b.hour && a.half === b.half
}

export function genClockQuestion(level: number, index: number): ClockQuestion {
  const rng = makeRng(level * 600 + index * 61 + Math.floor(Math.random() * 99900))
  // L1-L2 整点（1-12），L3 开始混合半点；L4-L5 用更大小时范围 + 相近干扰
  const allowHalf = level >= 3
  const hour = randInt(1, 12, rng)
  const half = allowHalf && rng() < 0.5

  const distractors: { hour: number; half: boolean }[] = []
  const seen = new Set<string>([`${hour}-${half}`])
  const candidates: { hour: number; half: boolean }[] = [
    { hour: hour === 12 ? 1 : hour + 1, half },
    { hour: hour === 1 ? 12 : hour - 1, half },
    { hour, half: !half },
    { hour: hour === 12 ? 1 : hour + 1, half: !half },
    { hour: hour === 11 ? 12 : hour + 2, half },
    { hour: hour === 1 ? 12 : hour - 2, half },
  ]
  for (const c of candidates) {
    if (distractors.length >= 2) break
    const key = `${c.hour}-${c.half}`
    if (!seen.has(key)) {
      seen.add(key)
      distractors.push(c)
    }
  }
  const choices = shuffle([{ hour, half }, ...distractors], rng)
  return { hour, half, choices, pickTime: true }
}

function QuestionView({ ctx, q }: { ctx: QuestionContext; q: ClockQuestion }) {
  const choose = (c: { hour: number; half: boolean }) => (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    ctx.report(sameTime(c, { hour: q.hour, half: q.half }), r.left + r.width / 2, r.top + r.height / 2)
  }

  return (
    <div style={{ width: 'min(860px, 94vw)', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <p className="question-text">🕐 看看钟面上的时针和分针，现在是几点呢？</p>
      <div style={{ display: 'flex', justifyContent: 'center' }} className="float-y">
        <ClockSvg
          hour={q.hour}
          half={q.half}
          size={240}
          highlight={ctx.feedback === 'correct'}
        />
      </div>
      <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
        {q.choices.map((c) => {
          const isAnswer = sameTime(c, { hour: q.hour, half: q.half })
          return (
            <button
              key={`${c.hour}-${c.half}`}
              className={`answer-number ${ctx.feedback === 'correct' && isAnswer ? 'selected-correct' : ''} ${ctx.feedback === 'wrong' ? 'shake' : ''}`}
              style={{ minWidth: 150, fontSize: 36 }}
              onClick={choose(c)}
              disabled={ctx.feedback === 'correct'}
            >
              {clockLabel(c.hour, c.half)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function ClockGame() {
  const current = useApp((s) => s.current)
  const level = current ? effectiveLevel(current.birthday, current.level_override) : 1
  const questions = useMemo(
    () => Array.from({ length: questionCount(level) }, (_, i) => genClockQuestion(level, i)),
    [level],
  )
  return (
    <GameShell
      gameType="clock"
      renderQuestion={(ctx) => <QuestionView key={ctx.questionKey} ctx={ctx} q={questions[ctx.index]} />}
      speakQuestion={(i) => {
        const q = questions[i]
        return q ? `看一看钟，现在是几点呢？` : null
      }}
    />
  )
}
