import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

// Cores padrão da paleta personalizada (usadas até o usuário escolher as dele)
const DEFAULT_CUSTOM = {
  fundo: '#F8FAFC', // fundo do app
  conta: '#FFFFFF', // cards / contas
  barra: '#1A3A5C', // barras de tarefa (header)
  fonte: '#1E293B', // cor do texto
}

// Converte #RRGGBB → "R G B" (formato exigido pelo rgb(var(...) / <alpha>) do Tailwind)
function hexToRgbTriplet(hex) {
  const h = (hex || '').replace('#', '')
  if (h.length !== 6) return '26 58 92'
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `${r} ${g} ${b}`
}

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme-dark')
    if (saved !== null) return saved === 'true'
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  const [palette, setPalette] = useState(() => {
    return localStorage.getItem('theme-palette') || 'default'
  })

  // Cores da paleta personalizada
  const [customColors, setCustomColors] = useState(() => {
    try {
      const saved = localStorage.getItem('theme-custom-colors')
      return saved ? { ...DEFAULT_CUSTOM, ...JSON.parse(saved) } : DEFAULT_CUSTOM
    } catch {
      return DEFAULT_CUSTOM
    }
  })

  // ── Modo escuro ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme-dark', isDark.toString())
  }, [isDark])

  // ── Persiste cores personalizadas ──────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('theme-custom-colors', JSON.stringify(customColors))
  }, [customColors])

  // ── Aplica a paleta (classe + variáveis CSS) ───────────────────────────────
  useEffect(() => {
    const el = document.documentElement

    // Limpa classes e variáveis inline de qualquer paleta anterior
    el.classList.remove('theme-monochrome', 'theme-earth', 'theme-custom')
    el.style.removeProperty('--color-background')
    el.style.removeProperty('--color-primary')
    el.style.removeProperty('--color-primary-hover')
    el.style.removeProperty('--color-primary-light')
    el.style.removeProperty('--custom-card')
    el.style.removeProperty('--custom-text')

    if (palette === 'monochrome') {
      el.classList.add('theme-monochrome')
    } else if (palette === 'earth') {
      el.classList.add('theme-earth')
    } else if (palette === 'custom') {
      el.classList.add('theme-custom')
      const rgb = hexToRgbTriplet(customColors.barra)
      el.style.setProperty('--color-background', customColors.fundo)
      el.style.setProperty('--color-primary', rgb)
      el.style.setProperty('--color-primary-hover', rgb)
      el.style.setProperty('--color-primary-light', rgb)
      el.style.setProperty('--custom-card', customColors.conta)
      el.style.setProperty('--custom-text', customColors.fonte)
    }

    localStorage.setItem('theme-palette', palette)
  }, [palette, customColors])

  const toggleTheme = () => setIsDark(prev => !prev)

  return (
    <ThemeContext.Provider value={{
      isDark, toggleTheme, setIsDark,
      palette, setPalette,
      customColors, setCustomColors,
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
