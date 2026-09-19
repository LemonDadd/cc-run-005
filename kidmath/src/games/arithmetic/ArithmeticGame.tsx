// 加减法果园：果园情境应用题。10 以内起步，高 Level 到 20 以内。
import { useMemo } from 'react'
import { FruitSvg } from '../../assets/svgs/Shapes'
import { GameShell, type QuestionContext } from '../common/GameShell'
import { questionCount } from '../../constants/games'
import { useApp } from '../../lib/store'
import { effectiveLevel } from '../../utils/date'
import { makeRng, randInt, shuffle } from '../../utils/random'

export interface ArithmeticQuestion {
  op: 'add' | 'sub'
  a: number
  b: number
  answer: number
  fruit: string
  character: string
  story: string
  choices: number[]
}

const FRUITS = ['apple', 'pear', 'orange', 'strawberry']
const CHARACTERS = ['小猴子', '小兔子', '小刺猬', '小熊']
const SCENES_ADD = [
  (c: string, fruit: string, a: number, b: number) =>
    `${c}先摘了 ${a} 个${fruitName(fruit)}，又摘了 ${b} 个，现在一共有几个${fruitName(fruit)}？`,
  (c: string, fruit: string, a: number, b: number) =>
    `果园里有 ${a} 个${fruitName(fruit)}，${c}又送来 ${b} 个，一共有几个？`,
]
const SCENES_SUB = [
  (c: string, fruit: string, a: number, b: number) =>
    `树上有 ${a} 个${fruitName(fruit)}，${c}摘走了 ${b} 个，还剩几个？`,
  (c: string, fruit: string, a: number, b: number) =>
    `${c}有 ${a} 个${fruitName(fruit)}，吃掉了 ${b} 个，还剩几个${fruitName(fruit)}？`,
]

function fruitName(id: string) {
  return { apple: '苹果', pear: '梨', orange: '橘子', strawberry: '草莓' }[id] ?? '果子'
}

/** 各等级数值上限：L1=5, L2=10, L3=10 混合, L4=15, L5=20 */
const MAX = [5, 10, 10, 15, 20]

export function genArithmeticQuestion(level: number, index: number): ArithmeticQuestion {
  const rng = makeRng(level * 300 + index * 71 + Math.floor(Math.random() * 99900))
  const max = MAX[Math.min(level - 1, 4)]
  const op: 'add' | 'sub' = rng() < (level === 1 ? 0.7 : 0.5) ? 'add' : 'sub'
  let a = 0
  let b = 0
  let answer = 0
  if (op === 'add') {
    a = randInt(1, max - 1, rng)
    b = randInt(1, max - a, rng)
    answer = a + b
  } else {
    a = randInt(2, max, rng)
    b = randInt(1, a - 1, rng)
    answer = a - b
  }
  const fruit = FRUITS[randInt(0, FRUITS.length - 1, rng)]
  const character = CHARACTERS[randInt(0, CHARACTERS.length - 1, rng)]
  const scene = (op === 'add' ? SCENES_ADD : SCENES_SUB)[randInt(0, 1, rng)]
  const story = scene(character, fruit, a, b)

  // 干扰项：答案 ±1/±2，不小于 0
  const deltas = new Set<number>()
  const cand = [1, -1, 2, -2, 3, -3]
  for (const d of cand) {
    if (deltas.size >= 2) break
    const v = answer + d
    if (v >= 0 && v !== answer && v <= 22) deltas.add(d)
  }
  let extra = answer + 2
  while (deltas.size < 2) {
    if (extra >= 0 && extra !== answer && !deltas.has(extra - answer)) deltas.add(extra - answer)
    extra -= 1
  }
  const choices = shuffle([answer, ...[...deltas].map((d) => answer + d)], rng)
  return { op, a, b, answer, fruit, character, story, choices }
}

function FruitVisual({ q }: { q: ArithmeticQuestion }) {
  // 用图示帮助理解：加法两组，减法摘走一组（淡化）
  const dimmed = q.op === 'sub'
  return (
    <div
      style={{
        display: 'flex',
        gap: 26,
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        minHeight: 130,
      }}
    >
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 360 }}>
        {Array.from({ length: q.a }, (_, i) => (
          <span key={i} className="pop-in" style={{ animationDelay: `${i * 45}ms` }}>
            <FruitSvg kind={q.fruit} size={52} />
          </span>
        ))}
      </div>
      <span style={{ fontSize: 52, fontWeight: 900 }}>{q.op === 'add' ? '➕' : '➖'}</span>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 260 }}>
        {Array.from({ length: q.b }, (_, i) => (
          <span
            key={i}
            className="pop-in"
            style={{ animationDelay: `${i * 45 + 200}ms`, opacity: dimmed ? 0.35 : 1 }}
          >
            <FruitSvg kind={q.fruit} size={52} />
          </span>
        ))}
      </div>
    </div>
  )
}

function QuestionView({ ctx, q }: { ctx: QuestionContext; q: ArithmeticQuestion }) {
  const choose = (n: number) => (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    ctx.report(n === q.answer, r.left + r.width / 2, r.top + r.height / 2)
  }

  return (
    <div style={{ width: 'min(860px, 94vw)', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ background: '#f3fbe9' }}>
        <p className="question-text" style={{ fontSize: 30 }}>
          🌳 {q.story}
        </p>
        <p style={{ textAlign: 'center', fontSize: 44, fontWeight: 900, marginTop: 10 }}>
          {q.a} {q.op === 'add' ? '+' : '−'} {q.b} = ?
        </p>
      </div>
      <FruitVisual q={q} />
      <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
        {q.choices.map((n) => (
          <button
            key={n}
            className={`answer-number ${ctx.feedback === 'correct' && n === q.answer ? 'selected-correct' : ''} ${ctx.feedback === 'wrong' ? 'shake' : ''}`}
            onClick={choose(n)}
            disabled={ctx.feedback === 'correct'}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ArithmeticGame() {
  const current = useApp((s) => s.current)
  const level = current ? effectiveLevel(current.birthday, current.level_override) : 1
  // 整轮题目只生成一次，保证 TTS 读题与画面一致
  const questions = useMemo(
    () =>
      Array.from({ length: questionCount(level) }, (_, i) =>
        genArithmeticQuestion(level, i),
      ),
    [level],
  )

  return (
    <GameShell
      gameType="arithmetic"
      renderQuestion={(ctx) => <QuestionView key={ctx.questionKey} ctx={ctx} q={questions[ctx.index]} />}
      speakQuestion={(i) => questions[i]?.story ?? null}
    />
  )
}
