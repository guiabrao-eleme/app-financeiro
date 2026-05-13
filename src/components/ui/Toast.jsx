import { useEffect, useState, useRef, useCallback } from 'react'

const DURATION = 5000 // 5 segundos

export function Toast({ message, type = 'success', onClose, onUndo }) {
  const [visible, setVisible] = useState(true)
  const [progress, setProgress] = useState(100)
  const startRef = useRef(Date.now())
  const rafRef = useRef(null)
  const closedRef = useRef(false)

  const close = useCallback(() => {
    if (closedRef.current) return
    closedRef.current = true
    setVisible(false)
    setTimeout(onClose, 300)
  }, [onClose])

  // Barra de progresso animada
  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startRef.current
      const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100)
      setProgress(remaining)
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        close()
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [close])

  const handleUndo = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    closedRef.current = true
    onUndo?.()
    setVisible(false)
    setTimeout(onClose, 300)
  }

  const colors = {
    success: { bg: 'bg-success', bar: 'bg-white/30' },
    error:   { bg: 'bg-danger',  bar: 'bg-white/30' },
    info:    { bg: 'bg-primary', bar: 'bg-white/30' },
    delete:  { bg: 'bg-slate-800', bar: 'bg-white/20' },
  }
  const c = colors[type] ?? colors.success

  const icons = {
    success: '✓',
    error:   '✕',
    info:    'ℹ',
    delete:  '🗑',
  }

  return (
    <div
      className={`relative overflow-hidden flex items-center gap-3 pl-4 pr-3 pt-3 pb-2 rounded-2xl shadow-xl max-w-sm w-full
        transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
        ${c.bg}`}
    >
      {/* Ícone */}
      <span className="text-white text-base flex-shrink-0">{icons[type] ?? '✓'}</span>

      {/* Mensagem */}
      <span className="text-white text-sm font-medium flex-1 leading-tight">{message}</span>

      {/* Botão desfazer */}
      {onUndo && (
        <button
          onClick={handleUndo}
          className="flex-shrink-0 text-white font-bold text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
        >
          Desfazer
        </button>
      )}

      {/* Botão fechar */}
      <button
        onClick={close}
        className="flex-shrink-0 text-white/60 hover:text-white text-sm w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
      >
        ✕
      </button>

      {/* Barra de progresso */}
      <div className={`absolute bottom-0 left-0 h-1 rounded-full transition-none ${c.bar}`}
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

export function useToast() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success', onUndo = null) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type, onUndo }])
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const ToastContainer = useCallback(() => (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            message={toast.message}
            type={toast.type}
            onUndo={toast.onUndo}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  ), [toasts, removeToast])

  return { addToast, ToastContainer }
}
