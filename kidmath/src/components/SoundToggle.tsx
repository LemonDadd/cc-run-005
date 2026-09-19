// 声音开关：音效与 TTS 一起开关（无语音时自动静音降级）
import { useState } from 'react'
import { setSoundEnabled } from '../utils/sound'
import { setTtsEnabled } from '../utils/tts'

export function SoundToggle() {
  const [on, setOn] = useState(true)
  return (
    <button
      className="ghost-btn"
      onClick={() => {
        const next = !on
        setOn(next)
        setSoundEnabled(next)
        setTtsEnabled(next)
      }}
      aria-pressed={on}
      title={on ? '声音开' : '声音关'}
      style={{ minHeight: 56, fontSize: 22, padding: '8px 20px' }}
    >
      {on ? '🔊' : '🔇'}
    </button>
  )
}
