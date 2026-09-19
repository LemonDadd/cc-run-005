import { useCallback, useEffect, useRef, useState } from "react";

export interface DragPayload {
  pieceId: number | string;
  label: string;
  /** 自定义数据，由调用方解释（图形形状/颜色等） */
  meta?: Record<string, string>;
}

interface DragState {
  payload: DragPayload;
  x: number;
  y: number;
  /** 当前指针下方的放置目标 id（命中 data-drop-id） */
  overId: string | null;
  /** 拖拽起点元素，用于回弹动画定位 */
  originRect: DOMRect;
}

const DRAG_GHOST_ATTR = "data-drag-ghost";

function dropIdAtPoint(x: number, y: number): string | null {
  const ghost = document.querySelector(`[${DRAG_GHOST_ATTR}="true"]`);
  if (ghost instanceof HTMLElement) ghost.style.display = "none";
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  if (ghost instanceof HTMLElement) ghost.style.display = "";
  const hit = el?.closest("[data-drop-id]") as HTMLElement | null;
  return hit?.getAttribute("data-drop-id") ?? null;
}

export function usePointerDrag(
  onDrop: (payload: DragPayload, dropId: string) => void
) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

  const beginDrag = useCallback((e: React.PointerEvent, payload: DragPayload) => {
    const origin = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const state: DragState = {
      payload,
      x: e.clientX,
      y: e.clientY,
      overId: null,
      originRect: origin,
    };
    dragRef.current = state;
    setDrag(state);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const s = dragRef.current;
      if (!s) return;
      const overId = dropIdAtPoint(e.clientX, e.clientY);
      const next = { ...s, x: e.clientX, y: e.clientY, overId };
      dragRef.current = next;
      setDrag(next);
    };
    const up = (e: PointerEvent) => {
      const s = dragRef.current;
      if (!s) return;
      const overId = dropIdAtPoint(e.clientX, e.clientY);
      dragRef.current = null;
      setDrag(null);
      if (overId) onDropRef.current(s.payload, overId);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", () => {
      dragRef.current = null;
      setDrag(null);
    });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  const isDragging = (pieceId: number | string) => drag?.payload.pieceId === pieceId;

  return { drag, beginDrag, isDragging, ghostAttr: DRAG_GHOST_ATTR };
}
