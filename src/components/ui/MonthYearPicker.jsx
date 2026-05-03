import { useState, useEffect, useRef } from 'react'

const MONTHS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

// variant: 'dark' (para headers azuis) | 'light' (para fundos brancos)
export default function MonthYearPicker({ year, month, onChange, variant = 'dark' }) {
  const [open, setOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(year)
  const ref = useRef(null)

  // Sincroniza o ano do picker com o valor externo ao abrir
  useEffect(() => {
    if (open) setPickerYear(year)
  }, [open, year])

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const select = (m) => {
    onChange(pickerYear, m)
    setOpen(false)
  }

  const isDark = variant === 'dark'

  const triggerClass = isDark
    ? 'text-base font-semibold tracking-wide hover:bg-white/10 px-3 py-1 rounded-xl transition-colors cursor-pointer select-none'
    : 'text-base font-semibold text-slate-700 hover:bg-slate-100 px-3 py-1 rounded-xl transition-colors cursor-pointer select-none'

  return (
    <div className="relative" ref={ref}>
      {/* Trigger — clique no nome do mês */}
      <button
        onClick={() => setOpen(v => !v)}
        className={triggerClass}
        aria-label="Selecionar mês e ano"
      >
        {MONTHS[month - 1]} {year}
        <span className={`ml-1.5 text-xs ${isDark ? 'opacity-60' : 'text-slate-400'}`}>▾</span>
      </button>

      {/* Dropdown picker */}
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 w-64">
          {/* Navegação de ano */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setPickerYear(y => y - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 transition-colors text-lg"
            >
              ‹
            </button>
            <span className="font-bold text-slate-800 text-sm">{pickerYear}</span>
            <button
              onClick={() => setPickerYear(y => y + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 transition-colors text-lg"
            >
              ›
            </button>
          </div>

          {/* Grid de meses */}
          <div className="grid grid-cols-4 gap-1.5">
            {MONTHS.map((label, i) => {
              const m = i + 1
              const isSelected = m === month && pickerYear === year
              const isToday = m === new Date().getMonth() + 1 && pickerYear === new Date().getFullYear()

              return (
                <button
                  key={m}
                  onClick={() => select(m)}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all
                    ${isSelected
                      ? 'bg-primary text-white shadow-sm'
                      : isToday
                        ? 'bg-primary/10 text-primary'
                        : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
