import { useEffect, useState } from "react";
import type { QuestionContext } from "../GameShell";
import { ClockFace } from "../../components/ShapeView";
import { clockWord, type ClockQuestion } from "../generators";

export function ClockPlay({ ctx }: { ctx: QuestionContext }) {
  const q = ctx.question as ClockQuestion;
  const [picked, setPicked] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);

  useEffect(() => {
    setPicked(null);
    setWrong(null);
  }, [q]);

  const choose = (value: string, el: HTMLButtonElement | null) => {
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
    <div style={{ width: "min(880px,96vw)", display: "grid", gap: 18 }}>
      <h2 style={{ textAlign: "center", fontSize: 32 }}>{q.prompt}</h2>
      <div className="center">
        <div className="float">
          <ClockFace hour={q.hour} minute={q.minute} size={290} />
        </div>
      </div>
      <p className="center muted" style={{ fontSize: 22, margin: 0 }}>
        短针是时针，长针是分针
      </p>
      <div className="row wrap" style={{ justifyContent: "center", gap: 16 }}>
        {q.choices.map((value) => (
          <button
            key={value}
            className={`option-btn ${
              ctx.locked && picked === value ? "correct-glow" : ""
            } ${wrong === value ? "shake" : ""}`}
            style={{ width: 150, fontSize: 34 }}
            onClick={(e) => choose(value, e.currentTarget)}
            disabled={ctx.locked}
          >
            {value}
            <span style={{ fontSize: 18, display: "block", color: "var(--ink-soft)" }}>
              {clockWord(
                Number(value.split(":")[0]),
                value.endsWith("30") ? 30 : 0
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
