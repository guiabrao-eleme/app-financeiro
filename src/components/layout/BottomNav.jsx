import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'

const tabs = [
  {
    id: 'dashboard',
    label: 'Início',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8} className="w-5 h-5">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    id: 'registros',
    label: 'Registros',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="w-5 h-5">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" strokeLinecap="round" />
        <rect x="9" y="3" width="6" height="4" rx="1" strokeLinecap="round" />
        <path d="M9 12h6M9 16h4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'calendario',
    label: 'Agenda',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="w-5 h-5">
        <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round"/>
        {active && (
          <>
            <circle cx="8" cy="15" r="1" fill="currentColor" stroke="none"/>
            <circle cx="12" cy="15" r="1" fill="currentColor" stroke="none"/>
            <circle cx="16" cy="15" r="1" fill="currentColor" stroke="none"/>
          </>
        )}
      </svg>
    ),
  },
  {
    id: 'anual',
    label: 'Anual',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} className="w-5 h-5">
        <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 16l4-4 4 4 4-8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'observacoes',
    label: 'Notas',
    icon: (active) => (
      active ? (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z"/>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
          <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M7 8h10M7 12h10M7 16h5" strokeLinecap="round"/>
        </svg>
      )
    ),
  },
]

export default function BottomNav({ active, onChange }) {
  const tabRefs = useRef([])
  const containerRef = useRef(null)
  const [indicatorBounds, setIndicatorBounds] = useState({ left: 0, width: 0 })

  useEffect(() => {
    const activeIndex = tabs.findIndex(t => t.id === active)
    const el = tabRefs.current[activeIndex]
    const container = containerRef.current
    if (!el || !container) return

    const elRect = el.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()

    setIndicatorBounds({
      left: elRect.left - containerRect.left,
      width: elRect.width,
    })
  }, [active])

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div ref={containerRef} className="relative flex items-center justify-around px-1 py-1">

        {/* Indicador deslizante */}
        {indicatorBounds.width > 0 && (
          <motion.div
            className="absolute top-1 bottom-1 bg-primary rounded-2xl z-0"
            initial={false}
            animate={{
              left: indicatorBounds.left,
              width: indicatorBounds.width,
            }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 32,
            }}
          />
        )}

        {tabs.map((tab, index) => {
          const isActive = active === tab.id
          return (
            <button
              key={tab.id}
              ref={el => { tabRefs.current[index] = el }}
              onClick={() => onChange(tab.id)}
              className={`relative z-10 flex flex-col items-center gap-0.5 py-2.5 px-3 rounded-2xl transition-colors duration-200
                ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}
            >
              {tab.icon(isActive)}
              <span className={`text-[9px] font-semibold ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
