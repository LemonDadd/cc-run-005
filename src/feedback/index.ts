// 统一的答题反馈入口。答对/答错都会在调用瞬间（远小于 500ms）：
//  - 播放本地音效
//  - 触发 Web Speech TTS（不可用时静默降级）
//  - 喷射星星粒子 / 轻微抖动
//  - 弹出无“失败”字样的温和文字横幅
import { playSound } from "./sound";
import { speak } from "./tts";

export type FeedbackKind = "correct" | "wrong";

const CONFETTI_COLORS = ["#ff8a3d", "#48c6ef", "#34c77b", "#ff6b9d", "#ffd35a", "#8d6bff"];

function centerOf(el: Element | null | undefined): { x: number; y: number } {
  if (!el || typeof el.getBoundingClientRect !== "function") {
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export function burstStars(el?: Element | null, count = 8): void {
  const { x, y } = centerOf(el);
  for (let i = 0; i < count; i++) {
    const s = document.createElement("div");
    s.className = "star-particle";
    s.textContent = Math.random() < 0.7 ? "⭐" : "✨";
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
    const dist = 90 + Math.random() * 120;
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
    s.style.setProperty("--dy", `${Math.sin(angle) * dist - 60}px`);
    document.body.appendChild(s);
    window.setTimeout(() => s.remove(), 950);
  }
}

export function confettiRain(count = 60): void {
  for (let i = 0; i < count; i++) {
    const c = document.createElement("div");
    c.className = "confetti";
    c.style.left = `${Math.random() * 100}vw`;
    c.style.top = `-24px`;
    c.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    c.style.animationDuration = `${1.8 + Math.random() * 1.6}s`;
    c.style.animationDelay = `${Math.random() * 0.6}s`;
    c.style.transform = `rotate(${Math.random() * 360}deg)`;
    document.body.appendChild(c);
    window.setTimeout(() => c.remove(), 3800);
  }
}

export function triggerFeedback(kind: FeedbackKind, el?: Element | null): void {
  if (kind === "correct") {
    playSound("correct");
    speak("答对啦");
    burstStars(el);
  } else {
    playSound("wrong");
    speak("再试一次");
  }
  window.dispatchEvent(
    new CustomEvent<FeedbackKind>("kidmath:feedback", { detail: kind })
  );
}

/** 结算/通关庆祝。 */
export function celebrate(): void {
  playSound("win");
  confettiRain(80);
}
