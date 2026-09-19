import { useEffect, useState } from "react";
import type { FeedbackKind } from "../feedback";

// 全局、瞬时的文字反馈。答对绿色“答对啦”，答错用温和的蓝色“再试一次”
// （不出现红叉或“失败”字样）。
export function FeedbackToast() {
  const [item, setItem] = useState<{ id: number; kind: FeedbackKind } | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const handler = (e: Event) => {
      const kind = (e as CustomEvent<FeedbackKind>).detail;
      setItem({ id: Date.now(), kind });
      timer = setTimeout(() => setItem(null), 750);
    };
    window.addEventListener("kidmath:feedback", handler);
    return () => {
      window.removeEventListener("kidmath:feedback", handler);
      clearTimeout(timer);
    };
  }, []);

  if (!item) return null;
  const text = item.kind === "correct" ? "答对啦！" : "再试一次～";
  const style: React.CSSProperties =
    item.kind === "correct"
      ? { color: "var(--success)" }
      : { color: "#3a78c2" };
  return (
    <div className="feedback-banner" style={style} key={item.id} role="status">
      {item.kind === "correct" ? "⭐ " : "💙 "}
      {text}
    </div>
  );
}
