import { useState, useRef, useEffect, useCallback } from 'react'

/**
 * Hook que adiciona gesto de "arrastar para baixo" num bottom sheet.
 * Quando o usuário arrasta o conteúdo do sheet para baixo (e está no topo do scroll),
 * o sheet visualmente desce. Se arrastar mais de THRESHOLD px, chama onMinimize.
 *
 * IMPORTANTE: usa addEventListener nativo com passive:false para conseguir
 * chamar preventDefault() — assim o navegador não rola a página por trás
 * enquanto o usuário arrasta o sheet.
 *
 * @param {Function} onMinimize - callback chamado ao minimizar
 * @param {Boolean} enabled - se o gesto está ativo (geralmente !minimized)
 */
export function useSwipeDown(onMinimize, enabled = true) {
  const [translateY, setTranslateY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const sheetRef = useRef(null)

  // Refs para os handlers terem acesso ao valor mais recente sem re-criar listeners
  const enabledRef     = useRef(enabled)
  const translateYRef  = useRef(0)
  const onMinimizeRef  = useRef(onMinimize)

  useEffect(() => { enabledRef.current = enabled }, [enabled])
  useEffect(() => { translateYRef.current = translateY }, [translateY])
  useEffect(() => { onMinimizeRef.current = onMinimize }, [onMinimize])

  const THRESHOLD = 80

  useEffect(() => {
    const el = sheetRef.current
    if (!el) return

    let startY = null

    const handleTouchStart = (e) => {
      if (!enabledRef.current) return
      if (el.scrollTop > 0) return
      startY = e.touches[0].clientY
    }

    const handleTouchMove = (e) => {
      if (startY === null) return
      // Se durante o move começou a rolar (scrollTop > 0), cancela drag
      if (el.scrollTop > 0) {
        startY = null
        setTranslateY(0)
        setIsDragging(false)
        return
      }
      const delta = e.touches[0].clientY - startY
      if (delta > 0) {
        // Previne o scroll nativo do fundo durante o drag
        e.preventDefault()
        setTranslateY(delta * 0.7) // resistência elástica
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

    // passive: false permite preventDefault no touchmove
    el.addEventListener('touchstart', handleTouchStart, { passive: false })
    el.addEventListener('touchmove',  handleTouchMove,  { passive: false })
    el.addEventListener('touchend',   handleTouchEnd)
    el.addEventListener('touchcancel', handleTouchEnd)

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove',  handleTouchMove)
      el.removeEventListener('touchend',   handleTouchEnd)
      el.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [])

  return {
    sheetRef,
    swipeStyle: {
      transform: `translate(-50%, ${translateY}px)`,
      transition: isDragging ? 'none' : 'transform 0.25s ease-out',
    },
    // touchHandlers vazio — listeners aplicados via useEffect com passive:false
    touchHandlers: {},
  }
}

/**
 * Hook auxiliar para travar o scroll do body enquanto um modal/sheet está aberto e expandido.
 * Combina com useSwipeDown para evitar que o fundo "mexa" durante o gesto.
 */
export function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [active])
}
