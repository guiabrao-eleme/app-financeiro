import { Skeleton } from '../ui/Skeleton'
import { getCatMeta } from '../../hooks/useCategories'

export default function CategoryChart({ data, loading, categories = [] }) {
  if (loading) return <Skeleton className="h-52 mx-4" />

  const cats = Object.keys(data).filter(cat =>
    (data[cat]?.entradas ?? 0) + (data[cat]?.saidas ?? 0) > 0
  )

  if (cats.length === 0) return null

  const maxValue = Math.max(
    1,
    ...cats.flatMap(cat => [data[cat]?.entradas ?? 0, data[cat]?.saidas ?? 0])
  )

  const barHeight = 130

  return (
    <div className="mx-4 bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Por categoria</h3>

      <div className="overflow-x-auto scrollbar-none">
        <div
          className="flex items-end gap-2"
          style={{ height: barHeight + 40, minWidth: cats.length * 52 }}
        >
          {cats.map((cat) => {
            const entradas = data[cat]?.entradas ?? 0
            const saidas = data[cat]?.saidas ?? 0
            const hEntradas = entradas > 0 ? Math.max(4, (entradas / maxValue) * barHeight) : 0
            const hSaidas = saidas > 0 ? Math.max(4, (saidas / maxValue) * barHeight) : 0
            const meta = getCatMeta(cat, categories)

            return (
              <div key={cat} className="flex flex-col items-center flex-1 gap-1" style={{ minWidth: 44 }}>
                <div className="flex items-end gap-0.5 w-full justify-center" style={{ height: barHeight }}>
                  {entradas > 0 && (
                    <div className="flex-1 max-w-[14px] flex flex-col justify-end">
                      <div className="rounded-t-md bg-success transition-all duration-500" style={{ height: hEntradas }} />
                    </div>
                  )}
                  {saidas > 0 && (
                    <div className="flex-1 max-w-[14px] flex flex-col justify-end">
                      <div className="rounded-t-md bg-danger transition-all duration-500" style={{ height: hSaidas }} />
                    </div>
                  )}
                </div>
                <span className="text-lg leading-none">{meta.icon}</span>
                <span className="text-[8px] text-slate-500 dark:text-slate-400 text-center leading-tight w-full truncate px-0.5">
                  {cat}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-4 mt-3 justify-center">
        <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span className="w-3 h-2 bg-success rounded-sm inline-block" /> Entradas
        </span>
        <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span className="w-3 h-2 bg-danger rounded-sm inline-block" /> Saídas
        </span>
      </div>
    </div>
  )
}
