import { useEffect, useState } from "react";
import type { QuestionContext } from "../GameShell";
import { COMPARE_EMOJI, type CompareQuestion } from "../generators";

export function ComparePlay({ ctx }: { ctx: QuestionContext }) {
  const q = ctx.question as CompareQuestion;
  const [picked, setPicked] = useState<"left" | "right" | null>(null);
  const [wrong, setWrong] = useState<"left" | "right" | null>(null);
  const emoji = COMPARE_EMOJI[q.object];

  useEffect(() => {
    setPicked(null);
    setWrong(null);
  }, [q]);

  const pick = (side: "left" | "right", el: HTMLButtonElement | null) => {
    if (ctx.locked) return;
    const ok = side === q.answer;
    if (ok) setPicked(side);
    else {
      setWrong(side);
      window.setTimeout(() => setWrong(null), 450);
    }
    ctx.submit(ok, el);
  };

  const side = (count: number, side: "left" | "right") => {
    const isPicked = picked === side && ctx.locked;
    const isWrong = wrong === side;
    return (
      <button
        className={`card center ${isPicked ? "correct-glow" : ""} ${isWrong ? "shake" : ""}`}
        onClick={(e) => pick(side, e.currentTarget)}
        disabled={ctx.locked}
        style={{
          flex: 1,
          minHeight: 360,
          gap: 14,
          padding: 22,
          alignContent: "center",
          flexWrap: "wrap",
          border: "none",
        }}
      >
        <div
          className="row wrap"
          style={{ gap: 8, justifyContent: "center", maxWidth: 380 }}
        >
          {Array.from({ length: count }, (_, i) => (
            <span
              key={i}
              className="float"
              style={{
                fontSize: 46,
                animationDelay: `${(i % 6) * 0.25}s`,
              }}
            >
              {emoji}
            </span>
          ))}
        </div>
        <span className="pill" style={{ fontSize: 22 }}>
          {count} 个
        </span>
      </button>
    );
  };

  return (
    <div style={{ width: "min(980px, 97vw)", display: "grid", gap: 18 }}>
      <h2 style={{ textAlign: "center", fontSize: 34 }}>
        哪一边更多？点一点它 👈 👉
      </h2>
      <div className="row" style={{ gap: 20, alignItems: "stretch" }}>
        {side(q.leftCount, "left")}
        <div style={{ fontSize: 60, alignSelf: "center" }} aria-hidden>
          ❔
        </div>
        {side(q.rightCount, "right")}
      </div>
    </div>
  );
}
