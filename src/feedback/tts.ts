// 中文语音朗读（读题 + 反馈）。优先 Web Speech API；不支持或被禁用时静音降级，
// 游戏仍可正常游玩。
const KEY = "kidmath.ttsEnabled";

let enabled = true;
let cachedVoice: SpeechSynthesisVoice | null = null;

try {
  enabled = localStorage.getItem(KEY) !== "0";
} catch {
  enabled = true;
}

export function isTtsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function isTtsEnabled(): boolean {
  return enabled && isTtsSupported();
}

export function setTtsEnabled(v: boolean): void {
  enabled = v;
  try {
    localStorage.setItem(KEY, v ? "1" : "0");
  } catch {
    /* ignore */
  }
  if (!v) stopSpeaking();
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (!isTtsSupported()) return null;
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  cachedVoice =
    voices.find((v) => v.lang === "zh-CN") ??
    voices.find((v) => v.lang.toLowerCase().startsWith("zh")) ??
    null;
  return cachedVoice;
}

if (isTtsSupported()) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = null;
    pickVoice();
  };
}

export function stopSpeaking(): void {
  if (isTtsSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
}

export function speak(text: string, opts: { interrupt?: boolean } = {}): void {
  if (!isTtsEnabled() || !text) return;
  try {
    if (opts.interrupt !== false) window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-CN";
    u.rate = 1.0;
    u.pitch = 1.15; // 略高音调，更亲切
    const v = pickVoice();
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  } catch {
    /* 静音降级 */
  }
}

/** 朗读当前题目（可被重复触发）。 */
export function readQuestion(text: string): void {
  speak(text, { interrupt: true });
}
