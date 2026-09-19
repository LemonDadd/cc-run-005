import { useEffect, useRef, useState } from "react";
import type { QuestionContext } from "../GameShell";
import { ShapeView } from "../../components/ShapeView";
import { usePointerDrag, type DragPayload } from "../usePointerDrag";
import { playSound } from "../../feedback/sound";
import type { ShapesQuestion } from "../generators";

export function ShapesPlay({ ctx }: { ctx: QuestionContext }) {
  const q = ctx.question as ShapesQuestion;
  const [placed, setPlaced] = useState<Record<number, number>>({}); // pieceId -> slotId
  const [wrongSlot, setWrongSlot] = useState<string | null>(null);
  const [bouncePiece, setBouncePiece] = useState<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const correctSoundPlayed = useRef(false);

  const reset = () => {
    setPlaced({});
    setWrongSlot(null);
    setBouncePiece(null);
    correctSoundPlayed.current = false;
  };
  useEffect(() => {
    reset();
  }, [q]);

  const remainingPieces = q.pieces.filter((p) => !placed[p.id]);

  const checkComplete = (next: Record<number, number>) => {
    const all = q.pieces.every((p) => next[p.id] != null);
    if (all && !correctSoundPlayed.current) {
      // 全部放置且每一步都经过校验，到达这里即全对。
      correctSoundPlayed.current = true;
      window.setTimeout(() => ctx.submit(true, stageRef.current), 220);
    }
  };

  const { drag, beginDrag, ghostAttr } = usePointerDrag((payload: DragPayload, dropId: string) => {
    if (ctx.locked) return;
    const pieceId = Number(payload.pieceId);
    const slotId = Number(dropId.replace("slot-", ""));
    const piece = q.pieces.find((p) => p.id === pieceId);
    const slot = q.slots.find((s) => s.id === slotId);
    if (!piece || !slot) return;
    const shapeOk = piece.shape === slot.shape;
    const colorOk = !q.matchColor || piece.color === slot.color;
    if (shapeOk && colorOk) {
      // 若该槽已放了别的碎片，先把它退回。
      const next: Record<number, number> = {};
      Object.entries(placed).forEach(([pid, sid]) => {
        if (sid !== slotId) next[Number(pid)] = sid;
      });
      next[pieceId] = slotId;
      setPlaced(next);
      checkComplete(next);
    } else {
      // 拖拽失败：抖动目标、碎片回弹（不惩罚，可继续尝试）。
      playSound("wrong");
      setWrongSlot(`slot-${slotId}`);
      setBouncePiece(pieceId);
      window.setTimeout(() => {
        setWrongSlot(null);
        setBouncePiece(null);
      }, 420);
    }
  });

  const pieceAt = (pieceId: number) => (
    <div
      key={pieceId}
      className={`draggable ${bouncePiece === pieceId ? "snap-back" : ""}`}
      onPointerDown={(e) =>
        beginDrag(e, {
          pieceId,
          label: "shape",
          meta: { shape: String(pieceId) },
        })
      }
      style={{
        opacity: drag && drag.payload.pieceId === pieceId ? 0.25 : 1,
        padding: 8,
      }}
    >
      <ShapeView
        shape={q.pieces.find((p) => p.id === pieceId)!.shape}
        color={q.pieces.find((p) => p.id === pieceId)!.color}
        size={84}
      />
    </div>
  );

  return (
    <div style={{ width: "min(920px, 97vw)", display: "grid", gap: 18 }}>
      <h2 style={{ textAlign: "center", fontSize: 32 }}>
        把图形拖回它们的家
        {q.matchColor ? "（还要颜色一样哦）" : ""}
      </h2>

      {/* 目标槽位 */}
      <div
        ref={stageRef}
        className="card row wrap"
        style={{ gap: 22, justifyContent: "center", minHeight: 200, background: "#f3efe2" }}
      >
        {q.slots.map((slot) => {
          const occupant = Object.entries(placed).find(([, sid]) => sid === slot.id)?.[0];
          const hot = drag?.overId === `slot-${slot.id}`;
          return (
            <div
              key={slot.id}
              data-drop-id={`slot-${slot.id}`}
              className={`drop-target center ${hot ? "drop-hot" : ""} ${
                wrongSlot === `slot-${slot.id}` ? "shake" : ""
              }`}
              style={{
                width: 132,
                height: 132,
                borderRadius: 28,
                background: "#fff",
                border: "4px dashed #c9c1a8",
              }}
            >
              {occupant ? (
                <ShapeView
                  shape={slot.shape}
                  color={q.matchColor ? slot.color : q.pieces.find((p) => p.id === Number(occupant))!.color}
                  size={92}
                />
              ) : (
                <ShapeView shape={slot.shape} color="#e6e0cd" size={92} stroke={false} />
              )}
            </div>
          );
        })}
      </div>

      {/* 待拖碎片 */}
      <div className="card row wrap" style={{ gap: 18, justifyContent: "center", minHeight: 140 }}>
        {remainingPieces.length === 0 && (
          <span className="muted" style={{ fontSize: 22 }}>
            全部配对成功啦！
          </span>
        )}
        {remainingPieces.map((p) => pieceAt(p.id))}
      </div>

      {drag && (
        <div
          className="drag-ghost"
          {...{ [ghostAttr]: "true" }}
          style={{ left: drag.x, top: drag.y }}
        >
          <ShapeView
            shape={q.pieces.find((p) => p.id === drag.payload.pieceId)!.shape}
            color={q.pieces.find((p) => p.id === drag.payload.pieceId)!.color}
            size={84}
          />
        </div>
      )}
    </div>
  );
}
