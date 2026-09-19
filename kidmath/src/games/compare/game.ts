// 比较大小：题目生成
import { makeRng, pick, randInt } from '../../utils/random'

export const COMPARE_FRUITS = ['apple', 'pear', 'orange', 'strawberry']

export interface CompareQuestion {
  left: number
  right: number
  leftFruit: string
  rightFruit: string
  /** 低等级两侧同种水果，高等级可不同种，避免只看外观 */
  sameKind: boolean
}

const MAX_BY_LEVEL = [3, 5, 7, 9, 10]

export function genCompareQuestion(level: number, index: number): CompareQuestion {
  const rng = makeRng(level * 200 + index * 53 + Math.floor(Math.random() * 99900))
  const max = MAX_BY_LEVEL[Math.min(level - 1, 4)]
  const minGap = level <= 2 ? 2 : 1
  // 从所有满足最小差距的数对中随机取一对，杜绝死循环
  const pairs: [number, number][] = []
  for (let x = 1; x <= max; x++)
    for (let y = 1; y <= max; y++)
      if (y - x >= minGap) pairs.push([x, y])
  const [lo, hi] = pairs[Math.floor(rng() * pairs.length)]
  const [left, right] = rng() < 0.5 ? [hi, lo] : [lo, hi]
  const a = left
  const b = right
  const sameKind = level <= 2 || rng() < 0.5
  const leftFruit = pick(COMPARE_FRUITS, rng)
  const rightFruit = sameKind
    ? leftFruit
    : pick(
        COMPARE_FRUITS.filter((f) => f !== leftFruit),
        rng,
      )
  return { left, right, leftFruit, rightFruit, sameKind }
}
