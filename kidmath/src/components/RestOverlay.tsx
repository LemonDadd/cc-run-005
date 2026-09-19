import { useEffect } from 'react'
import { playTts } from '../utils/tts'
import { formatTime } from '../utils/date'

/** 每日游玩时长到点后的温和提示：无“失败”字样，动画结束后保存并回首页 */
export function RestOverlay({
  remainingSec,
  onGoHome,
}: {
  remainingSec: number
  onGoHome: () => void
}) {
  useEffect(() => {
    void playTts('今天玩得真好，该休息一下啦，明天再来玩哦')
  }, [])

  return (
    <div className="rest-overlay" role="dialog" aria-live="polite">
      <div className="rest-card">
        <div className="float-y" style={{ fontSize: 110, lineHeight: 1 }}>
          🌙😴
        </div>
        <h1 style={{ fontSize: 40, margin: '18px 0 10px' }}>该休息啦</h1>
        <p className="hint-text" style={{ fontSize: 24, marginBottom: 8 }}>
          今天的游戏时间已经用完啦，
          <br />
          进度已经帮你保存好咯！
        </p>
        <p style={{ fontSize: 20, color: '#9a92ab', marginBottom: 26 }}>
          剩余 {formatTime(Math.max(0, remainingSec))}，明天再来找小动物们玩吧～
        </p>
        <button className="big-btn purple" onClick={onGoHome} autoFocus>
          回到首页
        </button>
      </div>
    </div>
  )
}
