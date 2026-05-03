import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency } from '../utils/format'
import { Skeleton } from '../components/ui/Skeleton'
import { downloadCSV, formatCSVCurrency } from '../utils/csv'

const MONTH_LABELS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MONTH_FULL   = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const CATEGORIES = ['Casa','Carro','Faculdade','Saídas','Outros']
const CAT_ICONS  = { Casa:'🏠', Carro:'🚗', Faculdade:'🎓', Saídas:'🛍️', Outros:'📦' }
const CAT_COLORS = {
  Casa:      'bg-blue-400',
  Carro:     'bg-orange-400',
  Faculdade: 'bg-purple-400',
  Saídas:    'bg-pink-400',
  Outros:    'bg-slate-400',
}

// ─── Gráfico de linha SVG ────────────────────────────────────────────────────

function LineChart({ monthlyData }) {
  const W = 320, H = 160
  const PAD = { top: 12, right: 12, bottom: 28, left: 44 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const entradas = monthlyData.map(m => m.entradas)
  const saidas   = monthlyData.map(m => m.saidas)
  const saldo    = monthlyData.map(m => m.entradas - m.saidas)

  const allVals = [...entradas, ...saidas, ...saldo]
  const maxVal  = Math.max(...allVals, 1)
  const minVal  = Math.min(...allVals, 0)
  const range   = maxVal - minVal || 1

  const xPos = (i) => PAD.left + (i / 11) * chartW
  const yPos = (v) => PAD.top + chartH - ((v - minVal) / range) * chartH

  const makePath = (values) =>
    values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i).toFixed(1)} ${yPos(v).toFixed(1)}`).join(' ')

  const zeroY = yPos(0)

  const series = [
    { values: entradas, color: '#059669', label: 'Entradas' },
    { values: saidas,   color: '#DC2626', label: 'Saídas'   },
    { values: saldo,    color: '#1A3A5C', label: 'Saldo'    },
  ]

  // Ticks Y (3 linhas de guia)
  const yTicks = [0, 0.5, 1].map(t => minVal + t * range)

  return (
    <div className="mx-4 bg-white rounded-2xl border border-slate-100 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Evolução mensal</h3>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 180 }}>
        {/* Linhas de guia */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD.left} x2={W - PAD.right}
              y1={yPos(v)} y2={yPos(v)}
              stroke="#e2e8f0" strokeWidth="1"
            />
            <text
              x={PAD.left - 4} y={yPos(v)}
              textAnchor="end" dominantBaseline="middle"
              fontSize="8" fill="#94a3b8"
            >
              {v >= 1000 ? `${(v/1000).toFixed(0)}k` : v.toFixed(0)}
            </text>
          </g>
        ))}

        {/* Linha do zero (se saldo pode ser negativo) */}
        {minVal < 0 && (
          <line
            x1={PAD.left} x2={W - PAD.right}
            y1={zeroY} y2={zeroY}
            stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,3"
          />
        )}

        {/* Labels do eixo X */}
        {MONTH_LABELS.map((lbl, i) => (
          <text
            key={i}
            x={xPos(i)} y={H - 6}
            textAnchor="middle" fontSize="7.5" fill="#94a3b8"
          >
            {lbl}
          </text>
        ))}

        {/* Linhas dos dados */}
        {series.map(({ values, color }) => (
          <path
            key={color}
            d={makePath(values)}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* Pontos */}
        {series.map(({ values, color }) =>
          values.map((v, i) => (
            <circle key={i} cx={xPos(i)} cy={yPos(v)} r="2.5" fill={color} />
          ))
        )}
      </svg>

      {/* Legenda */}
      <div className="flex items-center justify-center gap-4 mt-2">
        {series.map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Tabela mensal ───────────────────────────────────────────────────────────

function MonthlyTable({ monthlyData, currentYear }) {
  const now = new Date()
  const currentMonth = currentYear === now.getFullYear() ? now.getMonth() : -1

  const totEntradas = monthlyData.reduce((s, m) => s + m.entradas, 0)
  const totSaidas   = monthlyData.reduce((s, m) => s + m.saidas, 0)
  const totSaldo    = totEntradas - totSaidas

  return (
    <div className="mx-4 bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <h3 className="text-sm font-semibold text-slate-700 px-4 pt-4 pb-3">Mês a mês</h3>

      {/* Cabeçalho */}
      <div className="grid grid-cols-4 px-4 pb-2 border-b border-slate-100">
        <span className="text-xs text-slate-400 font-medium">Mês</span>
        <span className="text-xs text-slate-400 font-medium text-right">Entradas</span>
        <span className="text-xs text-slate-400 font-medium text-right">Saídas</span>
        <span className="text-xs text-slate-400 font-medium text-right">Saldo</span>
      </div>

      {monthlyData.map((row, i) => {
        const saldo = row.entradas - row.saidas
        const isCurrentMonth = i === currentMonth
        const hasData = row.entradas > 0 || row.saidas > 0

        return (
          <div
            key={i}
            className={`grid grid-cols-4 px-4 py-2.5 border-b border-slate-50 last:border-b-0
              ${isCurrentMonth ? 'bg-primary/5' : ''}`}
          >
            <span className={`text-xs font-medium flex items-center gap-1
              ${isCurrentMonth ? 'text-primary' : 'text-slate-600'}`}>
              {isCurrentMonth && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
              {MONTH_LABELS[i]}
            </span>

            <span className={`text-xs text-right ${hasData ? 'text-success font-medium' : 'text-slate-300'}`}>
              {hasData ? formatCurrency(row.entradas) : '—'}
            </span>
            <span className={`text-xs text-right ${hasData ? 'text-danger font-medium' : 'text-slate-300'}`}>
              {hasData ? formatCurrency(row.saidas) : '—'}
            </span>
            <span className={`text-xs text-right font-semibold
              ${!hasData ? 'text-slate-300' : saldo >= 0 ? 'text-primary' : 'text-danger'}`}>
              {hasData ? formatCurrency(saldo) : '—'}
            </span>
          </div>
        )
      })}

      {/* Total anual */}
      <div className="grid grid-cols-4 px-4 py-3 bg-slate-50 border-t border-slate-200">
        <span className="text-xs font-bold text-slate-700">Total</span>
        <span className="text-xs font-bold text-success text-right">{formatCurrency(totEntradas)}</span>
        <span className="text-xs font-bold text-danger text-right">{formatCurrency(totSaidas)}</span>
        <span className={`text-xs font-bold text-right ${totSaldo >= 0 ? 'text-primary' : 'text-danger'}`}>
          {formatCurrency(totSaldo)}
        </span>
      </div>
    </div>
  )
}

// ─── Breakdown por categoria ─────────────────────────────────────────────────

function CategoryBreakdown({ categoryData }) {
  const totalSaidas = CATEGORIES.reduce((s, c) => s + (categoryData[c]?.saidas ?? 0), 0)
  const rows = CATEGORIES
    .map(cat => ({ cat, value: categoryData[cat]?.saidas ?? 0 }))
    .filter(r => r.value > 0)
    .sort((a, b) => b.value - a.value)

  if (rows.length === 0) return null

  return (
    <div className="mx-4 bg-white rounded-2xl border border-slate-100 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Saídas por categoria no ano</h3>
      <div className="space-y-3.5">
        {rows.map(({ cat, value }) => {
          const pct = totalSaidas > 0 ? (value / totalSaidas) * 100 : 0
          return (
            <div key={cat}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-2 text-sm text-slate-700">
                  <span>{CAT_ICONS[cat]}</span> {cat}
                </span>
                <div className="text-right">
                  <span className="text-sm font-semibold text-danger">{formatCurrency(value)}</span>
                  <span className="text-[10px] text-slate-400 ml-1.5">{pct.toFixed(0)}%</span>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${CAT_COLORS[cat] ?? 'bg-slate-400'}`}
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

// ─── Skeletons ───────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-3 px-4 py-4">
      <Skeleton className="h-48" />
      <Skeleton className="h-72" />
      <Skeleton className="h-40" />
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function ResumoAnualPage() {
  const { user } = useAuth()
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [monthlyData, setMonthlyData] = useState(
    Array.from({ length: 12 }, () => ({ entradas: 0, saidas: 0 }))
  )
  const [categoryData, setCategoryData] = useState({})

  const handleExportCSV = () => {
    const headers = ['Mês', 'Entradas (R$)', 'Saídas (R$)', 'Saldo (R$)']
    const rows = monthlyData.map((m, i) => [
      MONTH_FULL[i],
      formatCSVCurrency(m.entradas),
      formatCSVCurrency(m.saidas),
      formatCSVCurrency(m.entradas - m.saidas),
    ])
    const totE = monthlyData.reduce((s, m) => s + m.entradas, 0)
    const totS = monthlyData.reduce((s, m) => s + m.saidas, 0)
    rows.push(['TOTAL ANUAL', formatCSVCurrency(totE), formatCSVCurrency(totS), formatCSVCurrency(totE - totS)])
    downloadCSV(`resumo-anual-${year}.csv`, headers, rows)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('lancamentos')
      .select('tipo, categoria, valor, data_vencimento')
      .eq('user_id', user.id)
      .gte('data_vencimento', `${year}-01-01`)
      .lte('data_vencimento', `${year}-12-31`)

    if (!error && data) {
      // Agrupa por mês
      const byMonth = Array.from({ length: 12 }, () => ({ entradas: 0, saidas: 0 }))
      const byCat = {}
      CATEGORIES.forEach(c => { byCat[c] = { entradas: 0, saidas: 0 } })

      data.forEach(l => {
        const m = parseInt(l.data_vencimento.split('-')[1]) - 1
        const v = Number(l.valor)
        if (l.tipo === 'Entrada') {
          byMonth[m].entradas += v
          if (byCat[l.categoria]) byCat[l.categoria].entradas += v
        } else {
          byMonth[m].saidas += v
          if (byCat[l.categoria]) byCat[l.categoria].saidas += v
        }
      })

      setMonthlyData(byMonth)
      setCategoryData(byCat)
    }

    setLoading(false)
  }, [user.id, year])

  useEffect(() => { fetchData() }, [fetchData])

  const hasAnyData = monthlyData.some(m => m.entradas > 0 || m.saidas > 0)

  return (
    <div className="min-h-screen bg-background pb-24 page-enter">
      {/* Header */}
      <div className="bg-primary text-white px-4 pt-10 pb-5 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold">Resumo Anual</h1>
          {hasAnyData && (
            <button
              onClick={handleExportCSV}
              title="Exportar CSV"
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
        <div className="flex items-center justify-between bg-white/10 rounded-2xl px-4 py-2">
          <button
            onClick={() => setYear(y => y - 1)}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors text-lg"
          >
            ‹
          </button>
          <span className="text-base font-bold tracking-widest">{year}</span>
          <button
            onClick={() => setYear(y => y + 1)}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors text-lg"
          >
            ›
          </button>
        </div>
      </div>

      {loading ? (
        <PageSkeleton />
      ) : !hasAnyData ? (
        <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
          <svg viewBox="0 0 120 120" className="w-32 h-32 mb-4" fill="none">
            <circle cx="60" cy="60" r="54" fill="#F1F5F9"/>
            <rect x="30" y="45" width="60" height="40" rx="6" fill="white" stroke="#CBD5E1" strokeWidth="2"/>
            <path d="M30 55h60" stroke="#CBD5E1" strokeWidth="2"/>
            <path d="M42 67h12M42 74h8M66 67h12M66 74h8" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round"/>
            <path d="M48 30 L60 42 L72 30" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h3 className="text-slate-700 font-semibold mb-1">Nenhum registro em {year}</h3>
          <p className="text-slate-400 text-sm">Navegue para outro ano ou adicione lançamentos.</p>
        </div>
      ) : (
        <div className="space-y-3 py-4">
          <LineChart monthlyData={monthlyData} />
          <MonthlyTable monthlyData={monthlyData} currentYear={year} />
          <CategoryBreakdown categoryData={categoryData} />
        </div>
      )}
    </div>
  )
}
