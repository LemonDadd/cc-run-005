// TTS：优先使用 Web Speech API 中文朗读；无语音或不可用时静音降级，游戏照常可玩。

let cachedVoice: SpeechSynthesisVoice | null = null
let ttsEnabled = true

function pickChineseVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null
  const voices = speechSynthesis.getVoices()
  return (
    voices.find((v) => /zh[-_]CN/i.test(v.lang) && /female|ting|xiao|yaoyao/i.test(v.name)) ||
    voices.find((v) => /zh[-_]CN/i.test(v.lang)) ||
    voices.find((v) => /^zh/i.test(v.lang)) ||
    null
  )
}

export function initTts() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  cachedVoice = pickChineseVoice()
  speechSynthesis.onvoiceschanged = () => {
    cachedVoice = pickChineseVoice()
  }
}

export function setTtsEnabled(v: boolean) {
  ttsEnabled = v
  if (!v) stopTts()
}

export function isTtsEnabled() {
  return ttsEnabled
}

/** 是否存在可用的中文语音 */
export function hasChineseVoice(): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false
  return pickChineseVoice() !== null
}

export function stopTts() {
  try {
    speechSynthesis.cancel()
  } catch {
    /* ignore */
  }
}

/** 朗读题目/反馈；失败静默，不影响游戏 */
export async function playTts(text: string, opts?: { rate?: number; interrupt?: boolean }) {
  if (!ttsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return
  try {
    if (opts?.interrupt !== false) speechSynthesis.cancel()
    if (!cachedVoice) cachedVoice = pickChineseVoice()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'zh-CN'
    if (cachedVoice) u.voice = cachedVoice
    u.rate = opts?.rate ?? 0.95
    u.pitch = 1.15 // 稍高音调，更亲切
    u.volume = 1
    speechSynthesis.speak(u)
  } catch {
    /* 无语音环境：静音降级 */
  }
}
