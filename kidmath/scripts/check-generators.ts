import { genCountingQuestion } from '../src/games/counting/game'
import { genCompareQuestion } from '../src/games/compare/game'
import { genArithmeticQuestion } from '../src/games/arithmetic/ArithmeticGame'
import { genClockQuestion } from '../src/games/clock/ClockGame'

for (let lvl = 1; lvl <= 5; lvl++) {
  for (let i = 0; i < 50; i++) {
    const c = genCountingQuestion(lvl, i)
    if (!c.choices.includes(c.fishCount) || new Set(c.choices).size !== 3)
      throw new Error(`counting lvl${lvl}`)
    if (c.fishCount < 0) throw new Error('counting negative')
    const cmp = genCompareQuestion(lvl, i)
    if (cmp.left === cmp.right || cmp.left <= 0 || cmp.right <= 0)
      throw new Error(`compare lvl${lvl}`)
    const a = genArithmeticQuestion(lvl, i)
    if (!a.choices.includes(a.answer) || a.answer < 0)
      throw new Error(`arith lvl${lvl}: ${a.a} ${a.op} ${a.b}`)
    if (a.op === 'add' && a.a + a.b !== a.answer) throw new Error('arith add mismatch')
    if (a.op === 'sub' && a.a - a.b !== a.answer) throw new Error('arith sub mismatch')
    const maxN = lvl <= 3 ? 10 : lvl === 4 ? 15 : 20
    if (a.op === 'add' && a.a + a.b > maxN)
      throw new Error(`arith exceeds ${maxN} lvl${lvl}: ${a.a}+${a.b}`)
    if (a.a > maxN) throw new Error(`arith a exceeds ${maxN}`)
    if (new Set(a.choices).size !== 3) throw new Error('arith choices dup')
    const k = genClockQuestion(lvl, i)
    if (!k.choices.some((x) => x.hour === k.hour && x.half === k.half))
      throw new Error('clock missing answer')
    if (new Set(k.choices.map((x) => `${x.hour}-${x.half}`)).size !== 3)
      throw new Error('clock dup choice')
  }
}
console.log('所有题目生成器 5 个等级 x 50 题校验通过')
