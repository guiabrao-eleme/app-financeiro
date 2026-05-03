import { Skeleton } from '../ui/Skeleton'

const CATEGORIES = ['Casa', 'Carro', 'Faculdade', 'Saídas', 'Outros']
const SHORT_LABELS = ['Casa', 'Carro', 'Facul.', 'Saídas', 'Outros']

export default function CategoryChart({ data, loading }) {
  if (loading) return <Skeleton className="h-52 mx-4" />

  // data: { [categoria]: { entradas: number, saidas: number } }
  const maxValue = Math.max(
    1,
    ...CATEGORIES.flatMap(cat => [
      data[cat]?.entradas ?? 0,
      data[cat]?.saidas ?? 0,
    ])
  )

  const barHeight = 130
  const hasAnyData = CATEGORIES.some(cat => (data[cat]?.entradas ?? 0) + (data[cat]?.saidas ?? 0) > 0)

  if (!hasAnyData) return null

  return (
    <div className="mx-4 bg-white rounded-2xl p-4 border border-slate-100">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Por categoria</h3>

      <div className="flex items-end justify-between gap-1" style={{ height: barHeight + 32 }}>
        {CATEGORIES.map((cat, i) => {
          const entradas = data[cat]?.entradas ?? 0
          const saidas = data[cat]?.saidas ?? 0
          const hEntradas = entradas > 0 ? Math.max(4, (entradas / maxValue) * barHeight) : 0
          const hSaidas = saidas > 0 ? Math.max(4, (saidas / maxValue) * barHeight) : 0

          return (
            <div key={cat} className="flex flex-col items-center flex-1 gap-1">
              {/* Barras */}
              <div className="flex items-end gap-0.5 w-full justify-center" style={{ height: barHeight }}>
                {/* Entradas */}
                <div className="flex-1 max-w-[14px] flex flex-col justify-end">
                  <div
                    className="rounded-t-md bg-success transition-all duration-500"
                    style={{ height: hEntradas }}
                  />
                </div>
                {/* Saídas */}
                <div className="flex-1 max-w-[14px] flex flex-col justify-end">
                  <div
                    className="rounded-t-md bg-danger transition-all duration-500"
                    style={{ height: hSaidas }}
                  />
                </div>
              </div>
              {/* Label */}
              <span className="text-[9px] text-slate-500 text-center leading-tight w-full">
                {SHORT_LABELS[i]}
              </span>
            </div>
          )
        })}
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 mt-3 justify-center">
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-3 h-2 bg-success rounded-sm inline-block" />
          Entradas
        </span>
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-3 h-2 bg-danger rounded-sm inline-block" />
          Saídas
        </span>
      </div>
    </div>
  )
}
