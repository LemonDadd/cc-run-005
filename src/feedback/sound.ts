// 本地音效：全部资源打包进应用，无网络请求。
// 音频元素在应用启动时预加载，确保答对反馈能在 500ms 内响起。
import correctUrl from "../assets/sounds/correct.wav?url";
import wrongUrl from "../assets/sounds/wrong.wav?url";
import clickUrl from "../assets/sounds/click.wav?url";
import starUrl from "../assets/sounds/star.wav?url";
import winUrl from "../assets/sounds/win.wav?url";

export type SoundName = "correct" | "wrong" | "click" | "star" | "win";

const URLS: Record<SoundName, string> = {
  correct: correctUrl,
  wrong: wrongUrl,
  click: clickUrl,
  star: starUrl,
  win: winUrl,
};

const KEY = "kidmath.soundEnabled";
const pool: Partial<Record<SoundName, HTMLAudioElement[]>> = {};
let enabled = true;

try {
  enabled = localStorage.getItem(KEY) !== "0";
} catch {
  enabled = true;
}

export function isSoundEnabled(): boolean {
  return enabled;
}

export function setSoundEnabled(v: boolean): void {
  enabled = v;
  try {
    localStorage.setItem(KEY, v ? "1" : "0");
  } catch {
    /* ignore */
  }
}

// 每种音效保留几个可复用实例，避免连点时声音被掐断。
function acquire(name: SoundName): HTMLAudioElement | null {
  if (!enabled) return null;
  let list = pool[name];
  if (!list) {
    list = [];
    pool[name] = list;
  }
  const free = list.find((a) => a.paused || a.ended) ?? list[0];
  if (free) {
    try {
      free.currentTime = 0;
    } catch {
      /* ignore */
    }
    return free;
  }
  if (list.length < 4) {
    const a = new Audio(URLS[name]);
    a.preload = "auto";
    list.push(a);
    return a;
  }
  return list[0];
}

export function preloadSounds(): void {
  (Object.keys(URLS) as SoundName[]).forEach((name) => {
    if (!pool[name]) pool[name] = [new Audio(URLS[name])];
    pool[name]![0].preload = "auto";
  });
}

export function playSound(name: SoundName): void {
  const a = acquire(name);
  if (!a) return;
  // 静默失败（例如浏览器自动播放策略），不影响游戏可玩性。
  void a.play().catch(() => undefined);
}
