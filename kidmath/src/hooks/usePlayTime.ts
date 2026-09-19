// 每日游玩时长追踪：进入游戏页计时，每 15 秒 + 离开页面时落库；
// 达到家长设定的每日时长时弹出“该休息啦”并保存进度返回首页。
import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '../lib/store'

export function usePlayTime(active: boolean) {
  const settings = useApp((s) => s.settings)
  const current = useApp((s) => s.current)
  const todayUsedSec = useApp((s) => s.todayUsedSec)
  const recordUsage = useApp((s) => s.recordUsage)
  const [showRest, setShowRest] = useState(false)
  const sinceFlush = useRef(0)
  const tickRef = useRef<number | null>(null)

  const limitSec = (settings?.daily_limit_min ?? 25) * 60
  const remaining = Math.max(0, limitSec - todayUsedSec)

  const flush = useCallback(
    (secs: number) => {
      if (secs > 0) void recordUsage(Math.round(secs))
    },
    [recordUsage],
  )

  useEffect(() => {
    if (!active || !current) return
    let last = Date.now()
    sinceFlush.current = 0

    const tick = () => {
      const now = Date.now()
      const dt = (now - last) / 1000
      last = now
      sinceFlush.current += dt
      if (sinceFlush.current >= 15) {
        flush(sinceFlush.current)
        sinceFlush.current = 0
      }
    }
    tickRef.current = window.setInterval(tick, 1000)

    const onHide = () => {
      if (document.visibilityState === 'hidden' && sinceFlush.current > 0) {
        flush(sinceFlush.current)
        sinceFlush.current = 0
      }
    }
    document.addEventListener('visibilitychange', onHide)

    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current)
      document.removeEventListener('visibilitychange', onHide)
      if (sinceFlush.current > 0) flush(sinceFlush.current)
    }
  }, [active, current, flush])

  useEffect(() => {
    if (active && current && todayUsedSec >= limitSec) {
      setShowRest(true)
    }
  }, [todayUsedSec, limitSec, active, current])

  return {
    remainingSec: remaining,
    limitSec,
    showRest,
    /** 手动记账（一轮结束时），避免时长丢失 */
    commit: () => {
      if (sinceFlush.current > 0) {
        flush(sinceFlush.current)
        sinceFlush.current = 0
      }
    },
  }
}
