import { useEffect, useRef, useState } from "react";
import type { QuestionContext } from "../GameShell";
import { ShapeView } from "../../components/ShapeView";
import { usePointerDrag, type DragPayload } from "../usePointerDrag";
import { playSound } from "../../feedback/sound";
import type { PatternQuestion, PatternUnit } from "../generators";

export function PatternPlay({ ctx }: { ctx: QuestionContext }) {
  const q = ctx.question as PatternQuestion;
  const [fills, setFills] = useState<Record<number, PatternUnit>>({});
  const [selected, setSelected] = useState<PatternUnit | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    setFills({});
    setSelected(null);
    setWrong(null);
    doneRef.current = false;
  }, [q]);

  const usedIds = new Set(Object.values(fills).map((u) => u.id));

  const tryFill = (unit: PatternUnit, blankIdx: number) => {
    if (ctx.locked) return;
    const slot = q.blanks.indexOf(blankIdx);
    const expectedToken = q.answerTokens[slot];
    const ok = unit.token === expectedToken;
    if (ok) {
      playSound("click");
      const next = { ...fills, [blankIdx]: unit };
      setFills(next);
      setSelected(null);
      if (q.blanks.every((b) => next[b]) && !doneRef.current) {
        doneRef.current = true;
        window.setTimeout(() => ctx.submit(true, stageRef.current), 220);
      }
    } else {
      playSound("wrong");
      setWrong(`blank-${blankIdx}`);
      window.setTimeout(() => setWrong(null), 420);
    }
  };

  const { drag, beginDrag, ghostAttr } = usePointerDrag((payload: DragPayload, dropId) => {
    const blankIdx = Number(dropId.replace("blank-", ""));
    const unit = q.choices.find((c) => c.id === payload.pieceId);
    if (unit) tryFill(unit, blankIdx);
  });

  return (
    <div style={{ width: "min(940px, 97vw)", display: "grid", gap: 18 }} ref={stageRef}>
      <h2 style={{ textAlign: "center", fontSize: 32 }}>
        看一看规律，把序列补完整吧！
      </h2>

      <div
        className="card row wrap"
        style={{ gap: 12, justifyContent: "center", minHeight: 170, background: "#f3efe2" }}
      >
        {q.sequence.map((unit, idx) => {
          const isBlank = q.blanks.includes(idx);
          const filled = fills[idx];
          const hot = drag?.overId === `blank-${idx}`;
          if (!isBlank) {
            return (
              <div key={idx} style={{ padding: 6 }}>
                <ShapeView shape={unit.shape} color={unit.color} size={78} />
              </div>
            );
          }
          return (
            <button
              key={idx}
              data-drop-id={`blank-${idx}`}
              className={`drop-target center ${hot ? "drop-hot" : ""} ${
                wrong === `blank-${idx}` ? "shake" : ""
              }`}
              onClick={() => {
                if (selected) tryFill(selected, idx);
              }}
              style={{
                width: 104,
                height: 104,
                borderRadius: 24,
                border: "4px dashed #b8b09a",
                background: selected ? "#fff6d8" : "#fff",
                padding: 0,
              }}
              aria-label="待补全的位置"
            >
              {filled ? (
                <ShapeView shape={filled.shape} color={filled.color} size={80} />
              ) : (
                <span style={{ fontSize: 44 }} aria-hidden>
                  ❔
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="muted center" style={{ fontSize: 18 }}>
        可以把下面的图形拖到 ❔ 上，也可以先点图形再点 ❔
      </p>

      <div className="card row wrap" style={{ gap: 16, justifyContent: "center", minHeight: 120 }}>
        {q.choices.map((c) => {
          const used = usedIds.has(c.id);
          const isSel = selected?.id === c.id;
          return (
            <div
              key={c.id}
              className="draggable"
              onPointerDown={(e) => beginDrag(e, { pieceId: c.id, label: "pattern" })}
              onClick={() => {
                if (used) return;
                playSound("click");
                setSelected((cur) => (cur?.id === c.id ? null : c));
              }}
              style={{
                padding: 8,
                borderRadius: 22,
                opacity: used ? 0.25 : 1,
                outline: isSel ? "5px solid var(--warn)" : "none",
                outlineOffset: 2,
                touchAction: "none",
              }}
            >
              <ShapeView shape={c.shape} color={c.color} size={72} />
            </div>
          );
        })}
      </div>

      {drag && (
        <div
          className="drag-ghost"
          {...{ [ghostAttr]: "true" }}
          style={{ left: drag.x, top: drag.y }}
        >
          {(() => {
            const c = q.choices.find((x) => x.id === drag.payload.pieceId)!;
            return <ShapeView shape={c.shape} color={c.color} size={72} />;
          })()}
        </div>
      )}
    </div>
  );
}
