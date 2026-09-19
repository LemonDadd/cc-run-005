// 4 位数字 PIN 键盘。错误时温和抖动，不暴露正确值。
import { useEffect, useState } from 'react'
import { sfxClick, sfxWrong } from '../utils/sound'

export function PinPad({
  title = '请输入家长 PIN',
  subtitle,
  onSubmit,
  onCancel,
}: {
  title?: string
  subtitle?: string
  onSubmit: (pin: string) => Promise<boolean> | boolean
  onCancel?: () => void
}) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key)
      if (e.key === 'Backspace') back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, checking])

  const press = (d: string) => {
    if (checking) return
    setError(false)
    sfxClick()
    setPin((p) => (p.length >= 4 ? p : p + d))
  }
  const back = () => {
    if (checking) return
    setPin((p) => p.slice(0, -1))
  }

  useEffect(() => {
    if (pin.length !== 4 || checking) return
    setChecking(true)
    Promise.resolve(onSubmit(pin)).then((ok) => {
      if (!ok) {
        setError(true)
        sfxWrong()
        setPin('')
      }
      setChecking(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

  return (
    <div
      className={`card pop-in ${error ? 'shake' : ''}`}
      style={{ width: 380, textAlign: 'center', padding: 28 }}
    >
      <div style={{ fontSize: 60 }} className="float-y">
        👪
      </div>
      <h2 style={{ fontSize: 30, margin: '6px 0 4px' }}>{title}</h2>
      {subtitle && <p className="hint-text" style={{ marginBottom: 12 }}>{subtitle}</p>}

      <div className={`pin-dots ${error ? 'shake' : ''}`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`pd ${pin.length > i ? 'on' : ''} ${error ? '' : ''}`} />
        ))}
      </div>
      <p
        style={{
          minHeight: 28,
          fontSize: 20,
          fontWeight: 800,
          color: '#d55050',
          marginBottom: 4,
        }}
      >
        {error ? 'PIN 不对哦，再试一次' : checking ? '验证中…' : ''}
      </p>

      <div className="pin-pad" style={{ margin: '0 auto 16px' }}>
        {keys.map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : (
            <button
              key={k}
              onClick={() => (k === '⌫' ? back() : press(k))}
              style={k === '⌫' ? { fontSize: 26 } : undefined}
            >
              {k}
            </button>
          ),
        )}
      </div>
      {onCancel && (
        <button className="ghost-btn" onClick={onCancel}>
          返回
        </button>
      )}
    </div>
  )
}
