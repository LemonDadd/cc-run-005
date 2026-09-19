// 原生 Pointer Events 拖拽：按下跟随手指/鼠标，松手判定放置；
// 未命中目标或目标校验不通过时由 CSS transition 自动回弹（拖拽失败可回弹）。
import { useCallback, useEffect, useRef, useState } from 'react'

interface UseDraggableArgs {
  id: string
  /** 当前指针中心位于哪个放置槽上 */
  hitTest: (x: number, y: number) => string | null
  /** 松手落在槽上时调用；返回 true 表示接受放置，false 表示拒绝并回弹 */
  onDrop: (slotId: string) => boolean | void
  /** 未命中/被拒绝回弹到原位后回调（坐标为松手位置，可用于播放温和提示） */
  onSnapBack?: (x: number, y: number) => void
  disabled?: boolean
}

export function useDraggable({ id, hitTest, onDrop, onSnapBack, disabled }: UseDraggableArgs) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [over, setOver] = useState<string | null>(null)
  const state = useRef({ dx: 0, dy: 0 })

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return
      const el = ref.current
      if (!el) return
      // 仅响应主键，避免右键/双指干扰
      if (e.button !== undefined && e.button !== 0) return
      e.preventDefault()
      try {
        el.setPointerCapture(e.pointerId)
      } catch {
        /* 某些环境不支持 capture，window 监听兜底 */
      }
      const rect = el.getBoundingClientRect()
      state.current.dx = e.clientX - (rect.left + rect.width / 2)
      state.current.dy = e.clientY - (rect.top + rect.height / 2)
      setPos({ x: e.clientX - state.current.dx, y: e.clientY - state.current.dy })
      setDragging(true)
    },
    [disabled],
  )

  useEffect(() => {
    if (!dragging) return
    const move = (e: PointerEvent) => {
      const x = e.clientX - state.current.dx
      const y = e.clientY - state.current.dy
      setPos({ x, y })
      setOver(hitTest(x, y))
    }
    const release = (e: PointerEvent) => {
      const x = e.clientX - state.current.dx
      const y = e.clientY - state.current.dy
      const slot = hitTest(x, y)
      setDragging(false)
      setOver(null)
      let accepted = false
      if (slot !== null) {
        accepted = onDrop(slot) !== false
      }
      if (accepted) {
        // 被接受：元素从托盘中移除（父组件会卸载它），直接清位置即可
        setPos(null)
      } else {
        // 未命中或被拒绝：保持在松手位置一帧，再过渡回原位，形成回弹
        setPos({ x, y })
        requestAnimationFrame(() => {
          setPos(null)
          window.setTimeout(() => onSnapBack?.(x, y), 200)
        })
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', release)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', release)
    }
    // id 变化（拖件替换）时重新绑定
  }, [dragging, hitTest, onDrop, onSnapBack, id])

  const style: React.CSSProperties = dragging
    ? {
        position: 'fixed',
        left: pos!.x,
        top: pos!.y,
        transform: 'translate(-50%, -50%) scale(1.1)',
        zIndex: 100,
      }
    : pos
      ? {
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          transform: 'translate(-50%, -50%)',
        }
      : { transform: 'none' }

  return {
    ref,
    dragProps: { onPointerDown },
    dragging,
    over,
    style,
  }
}
