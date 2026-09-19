import type { GameType } from "../types";
import type { GameQuestion } from "./generators";
import { GameShell, type QuestionContext } from "./GameShell";
import { CountingPlay } from "./plays/CountingPlay";
import { ComparePlay } from "./plays/ComparePlay";
import { OrchardPlay } from "./plays/OrchardPlay";
import { ShapesPlay } from "./plays/ShapesPlay";
import { PatternPlay } from "./plays/PatternPlay";
import { ClockPlay } from "./plays/ClockPlay";
import { clockWord } from "./generators";

function renderByType(game: GameType, ctx: QuestionContext) {
  switch (game) {
    case "counting":
      return <CountingPlay ctx={ctx} />;
    case "compare":
      return <ComparePlay ctx={ctx} />;
    case "orchard":
      return <OrchardPlay ctx={ctx} />;
    case "shapes":
      return <ShapesPlay ctx={ctx} />;
    case "pattern":
      return <PatternPlay ctx={ctx} />;
    case "clock":
      return <ClockPlay ctx={ctx} />;
  }
}

// 题面朗读文本（图形/规律拖拽题给一句引导即可）。
function speechFor(q: GameQuestion): string {
  switch (q.kind) {
    case "counting":
      return "数一数，海里有几条鱼？点一点鱼，再选出正确的数字。";
    case "compare":
      return "看一看，左边和右边，哪一边更多？";
    case "orchard":
      // 去掉 emoji 以便朗读更自然。
      return q.prompt.replace(/[🍎🍊🍐🫐🍑]/g, "水果");
    case "shapes":
      return q.matchColor
        ? "把图形拖回形状和颜色都一样的家。"
        : "把图形拖回形状一样的家。";
    case "pattern":
      return "看一看规律，把空缺的地方补完整。";
    case "clock":
      return `钟面上是几点呀？这是${clockWord(q.hour, q.minute)}。`;
  }
}

export function GameContainer() {
  return (
    <GameShell
      renderQuestion={(ctx) => renderByType(ctx.question.kind as GameType, ctx)}
      questionSpeech={speechFor}
    />
  );
}
