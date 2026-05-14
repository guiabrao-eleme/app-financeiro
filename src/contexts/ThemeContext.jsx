import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme-dark')
    if (saved !== null) return saved === 'true'
    // fallback to system preference if no saved value
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  const [palette, setPalette] = useState(() => {
    return localStorage.getItem('theme-palette') || 'default'
  })

  useEffect(() => {
    // Handling Dark Mode class
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme-dark', isDark.toString())
  }, [isDark])

  useEffect(() => {
    // Handling Palette class by removing all known palettes first
    document.documentElement.classList.remove('theme-monochrome', 'theme-earth')

    if (palette === 'monochrome') {
      document.documentElement.classList.add('theme-monochrome')
    } else if (palette === 'earth') {
      document.documentElement.classList.add('theme-earth')
    }
    localStorage.setItem('theme-palette', palette)
  }, [palette])

  const toggleTheme = () => setIsDark(prev => !prev)

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, setIsDark, palette, setPalette }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
