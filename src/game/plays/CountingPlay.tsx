import { useEffect, useMemo, useRef, useState } from "react";
import type { QuestionContext } from "../GameShell";
import type { CountingQuestion } from "../generators";

interface Fish {
  id: number;
  top: number; // %
  duration: number;
  delay: number;
  scale: number;
  emoji: string;
}

const FISH_EMOJI = ["🐟", "🐠", "🐡"];

function makeFish(count: number): Fish[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    top: 8 + Math.random() * 78,
    duration: 6 + Math.random() * 6,
    delay: -Math.random() * 8,
    scale: 0.85 + Math.random() * 0.5,
    emoji: FISH_EMOJI[i % FISH_EMOJI.length],
  }));
}

export function CountingPlay({ ctx }: { ctx: QuestionContext }) {
  const q = ctx.question as CountingQuestion;
  const [tapped, setTapped] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [wrongChoice, setWrongChoice] = useState<number | null>(null);
  const tankRef = useRef<HTMLDivElement>(null);
  const fish = useMemo(() => makeFish(q.count), [q.count]);

  // 重置本地状态（新题）。
  useEffect(() => {
    setTapped(0);
    setSelected(null);
    setWrongChoice(null);
  }, [q]);

  const tapFish = () => {
    setTapped((n) => Math.min(n + 1, q.count + 5));
  };

  const choose = (value: number) => {
    if (ctx.locked) return;
    setSelected(value);
    const ok = value === q.count;
    if (!ok) {
      setWrongChoice(value);
      window.setTimeout(() => setWrongChoice(null), 450);
      setSelected(null);
    }
    ctx.submit(ok, tankRef.current);
  };

  return (
    <div style={{ width: "min(900px, 96vw)", display: "grid", gap: 20 }}>
      <div className="row" style={{ justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 34 }}>数一数，海里有几条鱼？</h2>
        <span className="pill" style={{ fontSize: 22 }}>
          🖱️ 已点到 {tapped}
        </span>
      </div>

      <div
        ref={tankRef}
        style={{
          position: "relative",
          height: 340,
          borderRadius: 32,
          overflow: "hidden",
          background: "linear-gradient(180deg,#a7e8ff 0%,#3fa9e0 70%,#2c7fb8 100%)",
          boxShadow: "inset 0 -10px 0 rgba(0,0,0,.08), var(--shadow)",
        }}
      >
        {fish.map((f) => (
          <button
            key={f.id}
            onClick={tapFish}
            aria-label="一条鱼"
            style={{
              position: "absolute",
              top: `${f.top}%`,
              left: 0,
              background: "none",
              border: "none",
              padding: 0,
              fontSize: 56 * f.scale,
              transform: "scaleX(-1)",
              animation: `swim ${f.duration}s linear ${f.delay}s infinite`,
            }}
          >
            {f.emoji}
          </button>
        ))}
        <div style={{ position: "absolute", left: 18, bottom: 12, fontSize: 40, opacity: 0.85 }}>
          🪨🪸
        </div>
      </div>

      <div className="row wrap" style={{ justifyContent: "center", gap: 16 }}>
        {q.choices.map((value) => (
          <button
            key={value}
            className={`option-btn ${
              ctx.locked && selected === value ? "correct-glow" : ""
            } ${wrongChoice === value ? "shake" : ""}`}
            style={{ width: 130, fontSize: 36 }}
            onClick={() => choose(value)}
            disabled={ctx.locked}
          >
            {value}
          </button>
        ))}
      </div>

      <style>{`
        @keyframes swim { from { left: -10%; } to { left: 104%; } }
      `}</style>
    </div>
  );
}
