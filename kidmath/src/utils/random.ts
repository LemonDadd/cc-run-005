/** 随机工具（确定性可注入种子，方便测试） */

export function makeRng(seed?: number): () => number {
  let s = seed ?? Math.floor(Math.random() * 0xffffffff)
  return () => {
    // mulberry32
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function randInt(minInclusive: number, maxInclusive: number, rng: () => number = Math.random) {
  return minInclusive + Math.floor(rng() * (maxInclusive - minInclusive + 1))
}

export function pick<T>(arr: readonly T[], rng: () => number = Math.random): T {
  return arr[Math.floor(rng() * arr.length)]
}

/** 在排除指定值的前提下取 [min,max] 随机整数 */
export function randIntExcept(
  min: number,
  max: number,
  exclude: number[],
  rng: () => number = Math.random,
): number {
  const choices: number[] = []
  for (let v = min; v <= max; v++) if (!exclude.includes(v)) choices.push(v)
  return choices[Math.floor(rng() * choices.length)]
}
