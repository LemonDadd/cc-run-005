import { useEffect, useState } from "react";
import type { QuestionContext } from "../GameShell";
import { FRUIT_EMOJI, type OrchardQuestion } from "../generators";

export function OrchardPlay({ ctx }: { ctx: QuestionContext }) {
  const q = ctx.question as OrchardQuestion;
  const [picked, setPicked] = useState<number | null>(null);
  const [wrong, setWrong] = useState<number | null>(null);
  const fruit = q.prompt.match(/[🍎🍊🍐🫐🍑]/)?.[0] ?? "🍎";

  useEffect(() => {
    setPicked(null);
    setWrong(null);
  }, [q]);

  const choose = (value: number, el: HTMLButtonElement | null) => {
    if (ctx.locked) return;
    const ok = value === q.answer;
    if (ok) setPicked(value);
    else {
      setWrong(value);
      window.setTimeout(() => setWrong(null), 450);
    }
    ctx.submit(ok, el);
  };

  return (
    <div style={{ width: "min(880px, 96vw)", display: "grid", gap: 18 }}>
      <div
        className="card center"
        style={{
          gap: 8,
          textAlign: "center",
          background: "linear-gradient(180deg,#eaffd6,#fff8e0)",
        }}
      >
        <h2 style={{ fontSize: 32, lineHeight: 1.5 }}>{q.prompt}</h2>
      </div>

      <div
        className="card"
        style={{
          minHeight: 180,
          borderRadius: 40,
          background: "linear-gradient(180deg,#9be08f,#7cc96f)",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 6,
          padding: 24,
        }}
      >
        {/* 可视化：加法显示 a+b，减法显示 a 个并遮住 b 个 */}
        {Array.from({ length: q.op === "add" ? q.a : q.a }, (_, i) => (
          <span
            key={i}
            className="float"
            style={{
              fontSize: 42,
              opacity: q.op === "sub" && i >= q.a - q.b ? 0.25 : 1,
              filter: q.op === "sub" && i >= q.a - q.b ? "grayscale(1)" : "none",
              animationDelay: `${(i % 5) * 0.2}s`,
            }}
          >
            {q.op === "sub" && i >= q.a - q.b ? "❔" : fruit}
          </span>
        ))}
        {q.op === "add" && (
          <>
            <span style={{ fontSize: 44, margin: "0 8px" }} aria-hidden>
              ➕
            </span>
            {Array.from({ length: q.b }, (_, i) => (
              <span key={`b${i}`} className="float" style={{ fontSize: 42, animationDelay: `${i * 0.15}s` }}>
                {fruit}
              </span>
            ))}
          </>
        )}
      </div>

      <div className="row wrap" style={{ justifyContent: "center", gap: 16 }}>
        {q.choices.map((value) => (
          <button
            key={value}
            className={`option-btn ${
              ctx.locked && picked === value ? "correct-glow" : ""
            } ${wrong === value ? "shake" : ""}`}
            style={{ width: 130, fontSize: 38 }}
            onClick={(e) => choose(value, e.currentTarget)}
            disabled={ctx.locked}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="muted center" style={{ fontSize: 17 }}>
        {FRUIT_EMOJI && q.op === "sub" ? "变灰的水果被小兔子吃掉啦" : "点一点正确的数字"}
      </div>
    </div>
  );
}
