import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

export function TopBar({
  title,
  onBack,
  right,
}: {
  title?: string
  onBack?: () => void
  right?: ReactNode
}) {
  const navigate = useNavigate()
  return (
    <div className="topbar">
      <button
        className="ghost-btn"
        aria-label="返回"
        onClick={() => (onBack ? onBack() : navigate(-1))}
        style={{ minHeight: 56, fontSize: 22, padding: '8px 22px' }}
      >
        ← 返回
      </button>
      {title && <h2 style={{ fontSize: 28 }}>{title}</h2>}
      <div className="spacer" />
      {right}
    </div>
  )
}
