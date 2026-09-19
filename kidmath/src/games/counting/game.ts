// 数数捕鱼：题目参数与鱼群生成
import { makeRng, randInt, randIntExcept, shuffle } from '../../utils/random'

export interface CountingQuestion {
  fishCount: number
  choices: number[]
  /** 游动持续秒数（等级越高游得越快） */
  durationSec: number
  /** 鱼的颜色池 */
  colors: string[]
}

const COLORS = ['#2ea8e6', '#f58634', '#7ac142', '#e8568f', '#ffc93c', '#8b6fd6']

/** 各等级鱼的数量范围与游速 */
const LEVEL_CONF: { min: number; max: number; speed: [number, number] }[] = [
  { min: 1, max: 3, speed: [13, 18] }, // L1
  { min: 3, max: 5, speed: [11, 15] }, // L2
  { min: 5, max: 8, speed: [9, 13] }, // L3
  { min: 8, max: 12, speed: [7, 11] }, // L4
  { min: 10, max: 15, speed: [6, 9] }, // L5
]

export function genCountingQuestion(level: number, index: number): CountingQuestion {
  const rng = makeRng(level * 1000 + index * 37 + Math.floor(Math.random() * 99991))
  const conf = LEVEL_CONF[Math.min(level - 1, 4)]
  const fishCount = randInt(conf.min, conf.max, rng)
  const deltaChoices = new Set<number>()
  while (deltaChoices.size < 2) {
    const d = rng() < 0.5 ? -1 : 1
    const v = fishCount + d * randInt(1, 2, rng)
    if (v >= 0 && v !== fishCount) deltaChoices.add(v)
  }
  const choices = shuffle([fishCount, ...deltaChoices], rng)
  const colors = Array.from({ length: fishCount }, () => COLORS[randInt(0, COLORS.length - 1, rng)])
  const durationSec = randInt(conf.speed[0], conf.speed[1], rng)
  return { fishCount, choices, durationSec, colors }
}
