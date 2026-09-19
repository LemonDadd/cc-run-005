// 六个小游戏的题目生成器（纯函数）。所有数值范围按等级递进：
// Level 1-2 起步 10 以内，高 Level 到 20 以内。
import type { GameType } from "../types";

export type ShapeKind = "circle" | "square" | "triangle" | "star" | "heart" | "pentagon";
export type FruitKind = "apple" | "orange" | "pear" | "berry" | "peach";
export type CompareKind = "fish" | "balloon" | "flower";

export const SHAPE_COLORS = ["#ff6b6b", "#48c6ef", "#34c77b", "#ffb020", "#8d6bff"];
export const SHAPE_EMOJI: Record<ShapeKind, string> = {
  circle: "🔴",
  square: "🟦",
  triangle: "🔺",
  star: "⭐",
  heart: "❤️",
  pentagon: "⬟",
};
export const FRUIT_EMOJI: Record<FruitKind, string> = {
  apple: "🍎",
  orange: "🍊",
  pear: "🍐",
  berry: "🫐",
  peach: "🍑",
};
export const COMPARE_EMOJI: Record<CompareKind, string> = {
  fish: "🐠",
  balloon: "🎈",
  flower: "🌸",
};

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 等级对应的数值上限：L1=5, L2=10, L3=10, L4=20, L5=20（题更复杂）。
const MAX_BY_LEVEL = [5, 10, 10, 20, 20] as const;

/* ---------------- 数数捕鱼 ---------------- */
export interface CountingQuestion {
  kind: "counting";
  count: number;
  choices: number[];
}

export function makeCounting(level: number): CountingQuestion {
  const max = MAX_BY_LEVEL[level - 1] ?? 10;
  const min = level <= 2 ? 1 : 3;
  const count = randInt(min, max);
  // 从答案附近确定性地构造 4 个互不相同的候选项。
  const candidates = new Set<number>([count]);
  const offsets = shuffle([-2, -1, 1, 2, -3, 3]);
  for (const d of offsets) {
    if (candidates.size >= 4) break;
    const cand = count + d;
    if (cand >= 1 && cand <= max + 2) candidates.add(cand);
  }
  // 兜底：在合法范围内继续补足。
  for (let cand = 1; candidates.size < 4 && cand <= max + 2; cand++) {
    candidates.add(cand);
  }
  const choices = shuffle([...candidates]).slice(0, 4);
  return { kind: "counting", count, choices };
}

/* ---------------- 比较大小 ---------------- */
export interface CompareQuestion {
  kind: "compare";
  leftCount: number;
  rightCount: number;
  object: CompareKind;
  // 答案固定为更多的一边；平局不生成。
  answer: "left" | "right";
}

export function makeCompare(level: number): CompareQuestion {
  const max = MAX_BY_LEVEL[level - 1] ?? 10;
  let left = randInt(1, max);
  let right = randInt(1, max);
  while (right === left) right = randInt(1, max);
  // 高等级缩小差距、提高难度。
  if (level >= 4 && Math.abs(left - right) > 2) {
    right = Math.max(1, left + (Math.random() < 0.5 ? -1 : 1) * randInt(1, 2));
    if (right === left) right = left + 1;
  }
  return {
    kind: "compare",
    leftCount: left,
    rightCount: right,
    object: pick(["fish", "balloon", "flower"] as const),
    answer: right > left ? "right" : "left",
  };
}

/* ---------------- 加减法果园 ---------------- */
export interface OrchardQuestion {
  kind: "orchard";
  op: "add" | "sub";
  a: number;
  b: number;
  answer: number;
  choices: number[];
  prompt: string;
}

export function makeOrchard(level: number): OrchardQuestion {
  const max = MAX_BY_LEVEL[level - 1] ?? 10;
  const allowSub = level >= 2;
  const op: "add" | "sub" =
    !allowSub ? "add" : Math.random() < 0.5 ? "add" : "sub";
  let a = 0;
  let b = 0;
  let answer = 0;
  let fruit: FruitKind;
  let prompt = "";

  if (op === "add") {
    a = randInt(1, max - 1);
    b = randInt(1, max - a);
    answer = a + b;
    fruit = pick(["apple", "orange", "pear", "berry", "peach"] as const);
    const f = FRUIT_EMOJI[fruit];
    prompt = `树上有 ${a} 个${f}，又长出来 ${b} 个${f}，现在一共有几个${f}？`;
  } else {
    a = randInt(2, max);
    b = randInt(1, a - 1);
    answer = a - b;
    fruit = pick(["apple", "orange", "pear", "berry", "peach"] as const);
    const f = FRUIT_EMOJI[fruit];
    prompt = `篮子里有 ${a} 个${f}，小兔子吃掉 ${b} 个${f}，还剩几个${f}？`;
  }

  const set = new Set<number>([answer]);
  while (set.size < 4) {
    const delta = randInt(-3, 3) || 2;
    const cand = answer + delta;
    if (cand >= 0 && cand <= max + 3) set.add(cand);
  }
  return {
    kind: "orchard",
    op,
    a,
    b,
    answer,
    choices: shuffle([...set]),
    prompt,
  };
}

/* ---------------- 图形配对（进阶含颜色匹配） ---------------- */
export interface ShapeSlot {
  id: number;
  shape: ShapeKind;
  color: string;
  // 高等级需要颜色也匹配
  matchColor: boolean;
}
export interface ShapePiece {
  id: number;
  shape: ShapeKind;
  color: string;
}
export interface ShapesQuestion {
  kind: "shapes";
  slots: ShapeSlot[];
  pieces: ShapePiece[];
  matchColor: boolean;
}

export function makeShapes(level: number): ShapesQuestion {
  const shapesPool = (["circle", "square", "triangle", "star", "heart", "pentagon"] as const)
    .slice(0, level <= 1 ? 3 : level <= 3 ? 4 : 6);
  const count = level <= 2 ? 3 : level === 3 ? 4 : 5;
  const matchColor = level >= 4;
  const chosen = shuffle([...shapesPool]).slice(0, count);
  const slots: ShapeSlot[] = chosen.map((shape, i) => ({
    id: i,
    shape,
    color: SHAPE_COLORS[i % SHAPE_COLORS.length],
    matchColor,
  }));
  // 碎片与槽位一一对应但顺序打乱；颜色在需要时与槽位相同，
  // 不需要颜色匹配时给碎片统一中性色，避免误导。
  const pieces: ShapePiece[] = shuffle(
    slots.map((s) => ({
      id: s.id,
      shape: s.shape,
      color: matchColor ? s.color : "#ffffff",
    }))
  );
  return { kind: "shapes", slots, pieces, matchColor };
}

/* ---------------- 规律排序 ---------------- */
export type PatternUnit = {
  id: string;
  shape: ShapeKind;
  color: string;
  /** cycle 中的 token，用于判定拖拽是否正确；空位占位单元为 -1 */
  token: number;
};
export interface PatternQuestion {
  kind: "pattern";
  // 完整序列中需要填空的位置
  blanks: number[];
  // 每个空位对应的正确 token（cycle 中的索引）
  answerTokens: number[];
  sequence: PatternUnit[];
  choices: PatternUnit[];
}

const PATTERN_SHAPES: ShapeKind[] = ["circle", "square", "triangle", "star"];

function makeUnit(token: number): PatternUnit {
  return {
    id: `${token}-${Math.random().toString(36).slice(2, 7)}`,
    shape: PATTERN_SHAPES[token % PATTERN_SHAPES.length],
    color: SHAPE_COLORS[token % SHAPE_COLORS.length],
    token,
  };
}

export function makePattern(level: number): PatternQuestion {
  // L1-2: ABAB；L3: AABB / ABC；L4-5: ABCD / AAB 等更复杂规律。
  let cycle: number[];
  if (level === 1) cycle = [0, 1];
  else if (level === 2) cycle = Math.random() < 0.5 ? [0, 1] : [0, 0, 1, 1];
  else if (level === 3) cycle = [0, 1, 2];
  else if (level === 4) cycle = Math.random() < 0.5 ? [0, 1, 2] : [0, 0, 1];
  else cycle = [0, 1, 2, 3];

  const total = level <= 2 ? 6 : 8;
  const sequence: PatternUnit[] = Array.from({ length: total }, (_, i) =>
    makeUnit(cycle[i % cycle.length])
  );
  const blanks: number[] = [];
  const blankCount = level <= 2 ? 1 : 2;
  // 末尾留空，便于孩子按规律推导。
  for (let i = 0; i < blankCount; i++) blanks.push(total - 1 - i);
  blanks.sort((a, b) => a - b);

  const answerTokens = blanks.map((idx) => cycle[idx % cycle.length]);
  const choices: PatternUnit[] = [];
  const usedTokens = new Set<number>();
  answerTokens.forEach((t) => {
    choices.push({ ...makeUnit(t), id: `ans-${t}-${Math.random().toString(36).slice(2, 6)}` });
    usedTokens.add(t);
  });
  // 干扰项：使用规律中出现过的其它 token。
  const distractors = shuffle(cycle.filter((t) => !usedTokens.has(t)));
  let di = 0;
  while (choices.length < Math.min(4, blanks.length + 2)) {
    const t = distractors[di % distractors.length] ?? (di % cycle.length);
    choices.push({ ...makeUnit(t), id: `bad-${t}-${Math.random().toString(36).slice(2, 6)}` });
    di++;
  }

  // 清空待填位置（保留占位标记，token = -1）。
  blanks.forEach((idx) => {
    sequence[idx] = {
      id: `blank-${idx}`,
      shape: "circle",
      color: "transparent",
      token: -1,
    };
  });
  return {
    kind: "pattern",
    blanks,
    answerTokens,
    sequence,
    choices: shuffle(choices),
  };
}

/* ---------------- 认时钟（整点与半点） ---------------- */
export interface ClockQuestion {
  kind: "clock";
  hour: number; // 1-12
  minute: 0 | 30;
  answer: string; // 如 "3:00" / "3:30"
  choices: string[];
  prompt: string;
}

export function makeClock(level: number): ClockQuestion {
  const hour = randInt(1, 12);
  // L1-2 只考整点；L3+ 加入半点。
  const minute: 0 | 30 = level <= 2 ? 0 : Math.random() < 0.55 ? 0 : 30;
  const answer = `${hour}:${minute === 0 ? "00" : "30"}`;
  const prompt = `钟面上是几点呀？`;

  const set = new Set<string>([answer]);
  while (set.size < 4) {
    const h = randInt(1, 12);
    const m: 0 | 30 = Math.random() < 0.5 ? 0 : 30;
    set.add(`${h}:${m === 0 ? "00" : "30"}`);
  }
  return {
    kind: "clock",
    hour,
    minute,
    answer,
    choices: shuffle([...set]),
    prompt,
  };
}

export type GameQuestion =
  | CountingQuestion
  | CompareQuestion
  | OrchardQuestion
  | ShapesQuestion
  | PatternQuestion
  | ClockQuestion;

export function makeQuestion(game: GameType, level: number): GameQuestion {
  switch (game) {
    case "counting":
      return makeCounting(level);
    case "compare":
      return makeCompare(level);
    case "orchard":
      return makeOrchard(level);
    case "shapes":
      return makeShapes(level);
    case "pattern":
      return makePattern(level);
    case "clock":
      return makeClock(level);
  }
}

export function clockWord(hour: number, minute: 0 | 30): string {
  return minute === 0 ? `${hour} 点整` : `${hour} 点半`;
}
