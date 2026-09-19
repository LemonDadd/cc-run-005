// 纯 Node 自测：校验六个题目的生成器不变量。
// 通过 tsx 不可用，因此这里用 vite 的 esbuild 即时转译运行：
//   node --import ./scripts/ts-register.mjs scripts/selftest.mjs
import {
  makeClock,
  makeCompare,
  makeCounting,
  makeOrchard,
  makePattern,
  makeShapes,
} from "../src/game/generators.ts";
import { questionCountForLevel, starsForAccuracy } from "../src/game/catalog.ts";

let failures = 0;
let checks = 0;
function assert(cond, msg) {
  checks++;
  if (!cond) {
    failures++;
    if (failures <= 30) console.error("✗", msg);
  }
}

for (let level = 1; level <= 5; level++) {
  for (let trial = 0; trial < 200; trial++) {    // 数数
    const c = makeCounting(level);
    assert(c.count >= 1 && c.count <= 22, `L${level} 数数数量在范围: ${c.count}`);
    assert(c.choices.includes(c.count), "数数选项包含答案");
    assert(new Set(c.choices).size === c.choices.length, "数数选项无重复");

    // 比较
    const cmp = makeCompare(level);
    assert(cmp.leftCount !== cmp.rightCount, "比较左右不相等");
    assert(
      (cmp.answer === "right") === cmp.rightCount > cmp.leftCount,
      "比较答案正确"
    );

    // 果园
    const o = makeOrchard(level);
    if (o.op === "add") assert(o.a + o.b === o.answer, "加法答案正确");
    else {
      assert(o.b < o.a, "减法 b<a（结果非负）");
      assert(o.a - o.b === o.answer, "减法答案正确");
    }
    assert(o.choices.includes(o.answer), "果园选项包含答案");
    assert(new Set(o.choices).size === o.choices.length, "果园选项无重复");

    // 图形
    const s = makeShapes(level);
    assert(s.pieces.length === s.slots.length, "图形碎片数=槽位数");
    assert(new Set(s.pieces.map((p) => p.id)).size === s.pieces.length, "碎片 id 唯一");
    for (const piece of s.pieces) {
      const slot = s.slots.find((x) => x.id === piece.id);
      assert(!!slot, "碎片能找到对应槽位");
      if (s.matchColor) assert(piece.color === slot.color, "颜色匹配模式颜色一致");
    }

    // 规律：每个空位答案 token 都来自 cycle（选项中存在相同 token）。
    const p = makePattern(level);
    assert(p.blanks.length === p.answerTokens.length, "规律空位与答案数一致");
    for (const t of p.answerTokens) {
      assert(p.choices.some((u) => u.token === t), "规律答案在选项中");
    }
    assert(new Set(p.choices.map((u) => u.id)).size === p.choices.length, "规律选项 id 唯一");

    // 时钟
    const k = makeClock(level);
    assert(k.hour >= 1 && k.hour <= 12, "时钟小时合法");
    assert(k.minute === 0 || k.minute === 30, "时钟为整点或半点");
    assert(k.choices.includes(k.answer), "时钟选项包含答案");
    if (level <= 2) assert(k.minute === 0, "L1-2 仅整点");
  }
}

for (let l = 1; l <= 5; l++) {
  const n = questionCountForLevel(l);
  assert(n >= 5 && n <= 10, `Level ${l} 题数 ${n} 在 5-10`);
}
assert(starsForAccuracy(1) === 2, "100% = 2 星");
assert(starsForAccuracy(0.8) === 1, "80% = 1 星");
assert(starsForAccuracy(0.79) === 0, "<80% = 0 星");

if (failures > 0) {
  console.error(`\n${failures} 项断言失败（共 ${checks} 项检查）`);
  process.exit(1);
}
console.log(`\n全部生成器自测通过 ✅（共 ${checks} 项检查）`);
process.exit(0);
