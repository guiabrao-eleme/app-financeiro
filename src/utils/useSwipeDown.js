import { useState, useRef, useCallback } from 'react'

/**
 * Hook que adiciona gesto de "arrastar para baixo" num bottom sheet.
 * Usa CALLBACK REF para anexar/desanexar listeners corretamente mesmo quando
 * o sheet renderiza condicionalmente (retorna null e depois aparece).
 *
 * O preventDefault() no touchmove ativo impede o navegador de rolar a página
 * atrás enquanto o usuário arrasta o sheet — sem precisar travar o body.
 *
 * @param {Function} onMinimize - callback chamado ao minimizar (drag > 80px)
 * @param {Boolean} enabled - se o gesto está ativo (geralmente !minimized)
 */
export function useSwipeDown(onMinimize, enabled = true) {
  const [translateY, setTranslateY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  // Refs pros handlers terem acesso ao valor mais recente
  const enabledRef    = useRef(enabled)
  const translateYRef = useRef(0)
  const onMinimizeRef = useRef(onMinimize)
  const cleanupRef    = useRef(null)

  enabledRef.current    = enabled
  translateYRef.current = translateY
  onMinimizeRef.current = onMinimize

  const THRESHOLD = 80

  // Callback ref — chamado quando o DOM node anexa/desanexa.
  // É a única forma confiável de anexar listeners em componentes
  // que renderizam condicionalmente (return null → JSX).
  const sheetRef = useCallback((el) => {
    // Limpa listeners do node anterior, se houver
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }
    if (!el) return

    let startY = null

    const handleTouchStart = (e) => {
      if (!enabledRef.current) return
      if (el.scrollTop > 0) return
      startY = e.touches[0].clientY
    }

    const handleTouchMove = (e) => {
      if (startY === null) return
      if (el.scrollTop > 0) {
        startY = null
        setTranslateY(0)
        setIsDragging(false)
        return
      }
      const delta = e.touches[0].clientY - startY
      if (delta > 0) {
        // Previne scroll nativo do fundo durante o drag
        e.preventDefault()
        setTranslateY(delta * 0.7)
        setIsDragging(true)
      }
    }

    const handleTouchEnd = () => {
      if (startY === null) return
      if (translateYRef.current > THRESHOLD) onMinimizeRef.current?.()
      setTranslateY(0)
      setIsDragging(false)
      startY = null
    }

    el.addEventListener('touchstart',  handleTouchStart, { passive: false })
    el.addEventListener('touchmove',   handleTouchMove,  { passive: false })
    el.addEventListener('touchend',    handleTouchEnd)
    el.addEventListener('touchcancel', handleTouchEnd)

    cleanupRef.current = () => {
      el.removeEventListener('touchstart',  handleTouchStart)
      el.removeEventListener('touchmove',   handleTouchMove)
      el.removeEventListener('touchend',    handleTouchEnd)
      el.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [])

  return {
    sheetRef,
    swipeStyle: {
      transform: `translate(-50%, ${translateY}px)`,
      transition: isDragging ? 'none' : 'transform 0.25s ease-out',
    },
    touchHandlers: {}, // legado: listeners agora via callback ref
  }
}

/**
 * Hook auxiliar para travar o scroll do body — DEPRECADO.
 * Não use! O preventDefault no useSwipeDown já impede o scroll do fundo durante o drag.
 * Travar o body causa problemas com outros scrolls da página.
 */
export function useBodyScrollLock() {
  // No-op intencional — mantido apenas para não quebrar imports existentes.
}
