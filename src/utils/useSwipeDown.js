import { useState, useRef } from 'react'

/**
 * Hook que adiciona gesto de "arrastar para baixo" num bottom sheet.
 * Quando o usuário arrasta o conteúdo do sheet para baixo (e está no topo do scroll),
 * o sheet visualmente desce. Se arrastar mais de THRESHOLD px, chama onMinimize.
 *
 * @param {Function} onMinimize - callback chamado ao minimizar
 * @param {Boolean} enabled - se o gesto está ativo (geralmente !minimized)
 * @returns { sheetRef, swipeStyle, touchHandlers }
 */
export function useSwipeDown(onMinimize, enabled = true) {
  const [translateY, setTranslateY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const sheetRef = useRef(null)
  const startY = useRef(null)
  const startScrollTop = useRef(0)

  const THRESHOLD = 80 // px

  const onTouchStart = (e) => {
    if (!enabled || !sheetRef.current) return
    // Captura scrollTop no momento do início — se já estava rolando, não ativa drag
    startScrollTop.current = sheetRef.current.scrollTop
    if (startScrollTop.current > 0) return
    startY.current = e.touches[0].clientY
  }

  const onTouchMove = (e) => {
    if (startY.current === null) return
    // Se durante o move o scrollTop ficou > 0, cancela drag (usuário está rolando)
    if (sheetRef.current && sheetRef.current.scrollTop > 0) {
      startY.current = null
      setTranslateY(0)
      setIsDragging(false)
      return
    }
    const delta = e.touches[0].clientY - startY.current
    if (delta > 0) {
      setTranslateY(delta * 0.7) // resistência elástica
      setIsDragging(true)
    }
  }

  const onTouchEnd = () => {
    if (translateY > THRESHOLD) onMinimize?.()
    setTranslateY(0)
    setIsDragging(false)
    startY.current = null
  }

  // Combina o centering (-50% X) com o deslocamento Y do swipe
  // Para usar: substitui a classe `-translate-x-1/2` pelo `swipeStyle.transform`
  return {
    sheetRef,
    swipeStyle: {
      transform: `translate(-50%, ${translateY}px)`,
      transition: isDragging ? 'none' : 'transform 0.25s ease-out',
    },
    touchHandlers: { onTouchStart, onTouchMove, onTouchEnd },
  }
}
