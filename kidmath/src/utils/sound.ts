// 音效：本地打包的 wav 文件（由 scripts/generate-assets.mjs 生成）。
// 任何加载/播放失败都静默降级，绝不影响可玩性。
import { playTts } from './tts'

let cache: Record<string, HTMLAudioElement> = {}
let enabled = true

export function setSoundEnabled(v: boolean) {
  enabled = v
}

export function isSoundEnabled() {
  return enabled
}

function playFile(name: string) {
  if (!enabled) return
  try {
    if (!cache[name]) {
      cache[name] = new Audio(`${import.meta.env.BASE_URL}sounds/${name}.wav`)
      cache[name].preload = 'auto'
    }
    const el = cache[name]
    el.currentTime = 0
    // play() 返回的 promise 在用户尚未交互时可能 reject，忽略即可
    void el.play().catch(() => {})
  } catch {
    /* 静音降级 */
  }
}

/** 答对：清脆音效（反馈需在 500ms 内呈现，音效与视觉同步触发） */
export function sfxCorrect() {
  playFile('correct')
  void playTts('答对啦')
}

/** 答错：温和音效 + “再试一次”，不显示红叉 */
export function sfxWrong() {
  playFile('wrong')
  void playTts('再试一次')
}

export function sfxClick() {
  playFile('click')
}

export function sfxStar() {
  playFile('star')
}

export function sfxDone() {
  playFile('done')
}
