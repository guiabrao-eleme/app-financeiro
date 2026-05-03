import { formatCurrency } from '../../utils/format'
import { Skeleton } from '../ui/Skeleton'
import { getCatMeta } from '../../hooks/useCategories'

export default function CategoryTable({ data, totalSaidas, loading, categories = [] }) {
  if (loading) return <Skeleton className="h-44 mx-4" />

  const rows = Object.entries(data)
    .map(([cat, vals]) => ({ cat, value: vals?.saidas ?? 0 }))
    .filter(r => r.value > 0)
    .sort((a, b) => b.value - a.value)

  if (rows.length === 0) return null

  return (
    <div className="mx-4 bg-white rounded-2xl p-4 border border-slate-100">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Saídas por categoria</h3>

      <div className="space-y-3">
        {rows.map(({ cat, value }) => {
          const pct = totalSaidas > 0 ? (value / totalSaidas) * 100 : 0
          const meta = getCatMeta(cat, categories)

          return (
            <div key={cat}>
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-2 text-sm text-slate-700">
                  <span>{meta.icon}</span>
                  {cat}
                </span>
                <div className="text-right">
                  <span className="text-sm font-semibold text-danger">{formatCurrency(value)}</span>
                  <span className="text-[10px] text-slate-400 ml-1">{pct.toFixed(0)}%</span>
                </div>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-danger/60 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
