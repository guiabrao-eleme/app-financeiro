import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import SkyToggle from '../components/ui/SkyToggle'
import { formatCurrency } from '../utils/format'
import { Skeleton } from '../components/ui/Skeleton'
import { downloadCSV, formatCSVCurrency } from '../utils/csv'
import { useCategories, getCatMeta } from '../hooks/useCategories'

const MONTH_LABELS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MONTH_FULL   = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

// Cores para as barras de categoria no resumo anual (índice rotativo)
const BAR_COLORS = [
  'bg-blue-400','bg-orange-400','bg-purple-400','bg-pink-400',
  'bg-emerald-400','bg-sky-400','bg-amber-400','bg-green-400',
  'bg-rose-400','bg-indigo-400','bg-teal-400','bg-cyan-400',
]

// ─── Gráfico de linha SVG ────────────────────────────────────────────────────

function LineChart({ monthlyData }) {
  const W = 320, H = 160
  const PAD = { top: 12, right: 12, bottom: 28, left: 44 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const entradas = monthlyData.map(m => m.entradas)
  const saidas   = monthlyData.map(m => m.saidas)
  // Saldo acumulado: sobra do mês anterior entra como saldo inicial do próximo
  const saldo = monthlyData.reduce((acc, m) => {
    const prev = acc.length > 0 ? acc[acc.length - 1] : 0
    acc.push(prev + m.entradas - m.saidas)
    return acc
  }, [])

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
    <div className="mx-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Evolução mensal</h3>

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
          <span key={label} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
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
  const [expandedMonth, setExpandedMonth] = useState(null)

  const totEntradas = monthlyData.reduce((s, m) => s + m.entradas, 0)
  const totSaidas   = monthlyData.reduce((s, m) => s + m.saidas, 0)
  const totSaldo    = totEntradas - totSaidas

  const saldosAcumulados = monthlyData.reduce((acc, m) => {
    const prev = acc.length > 0 ? acc[acc.length - 1] : 0
    acc.push(prev + m.entradas - m.saidas)
    return acc
  }, [])

  return (
    <div className="mx-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 px-4 pt-4 pb-3">Mês a mês</h3>

      {/* Cabeçalho */}
      <div className="grid grid-cols-4 px-4 pb-2 border-b border-slate-100 dark:border-slate-700">
        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Mês</span>
        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium text-right">Saldo</span>
        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium text-right">Saídas</span>
        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium text-right">Resultado</span>
      </div>

      {monthlyData.map((row, i) => {
        const saldoAcum      = saldosAcumulados[i]
        const carry          = i > 0 ? saldosAcumulados[i - 1] : 0
        const isCurrentMonth = i === currentMonth
        const hasData        = row.entradas > 0 || row.saidas > 0
        const showAcum       = hasData || saldoAcum !== 0
        const isExpanded     = expandedMonth === i

        return (
          <div key={i} className={`border-b border-slate-50 dark:border-slate-700 last:border-b-0 ${isCurrentMonth ? 'bg-primary/5 dark:bg-primary/20' : ''}`}>

            {/* Linha principal — clicável */}
            <button
              type="button"
              onClick={() => setExpandedMonth(isExpanded ? null : i)}
              className="w-full grid grid-cols-4 px-4 py-3 text-left active:bg-slate-50 dark:active:bg-slate-700 transition-colors"
            >
              <span className={`text-xs font-medium flex items-center gap-1
                ${isCurrentMonth ? 'text-primary dark:text-blue-300' : 'text-slate-600 dark:text-slate-400'}`}>
                {isCurrentMonth && <span className="w-1.5 h-1.5 rounded-full bg-primary dark:bg-blue-300 flex-shrink-0" />}
                {MONTH_LABELS[i]}
              </span>

              <span className={`text-xs text-right font-bold
                ${!showAcum ? 'text-slate-300 dark:text-slate-600' : saldoAcum >= 0 ? 'text-primary dark:text-blue-300' : 'text-danger dark:text-red-400'}`}>
                {showAcum ? formatCurrency(saldoAcum) : '—'}
              </span>

              <span className={`text-xs text-right font-medium
                ${hasData ? 'text-danger dark:text-red-400' : 'text-slate-300 dark:text-slate-600'}`}>
                {hasData ? formatCurrency(row.saidas) : '—'}
              </span>

              <span className={`text-xs text-right font-medium
                ${!hasData ? 'text-slate-300 dark:text-slate-600' : (row.entradas - row.saidas) >= 0 ? 'text-success dark:text-emerald-400' : 'text-danger dark:text-red-400'}`}>
                {hasData ? formatCurrency(row.entradas - row.saidas) : '—'}
              </span>
            </button>

            {/* Painel de detalhes — aparece ao clicar */}
            {isExpanded && (hasData || carry !== 0) && (
              <div className="mx-4 mb-3 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 px-4 py-3 space-y-1.5">
                {carry !== 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Saldo anterior</span>
                    <span className={`font-medium ${carry >= 0 ? 'text-primary dark:text-blue-300' : 'text-danger dark:text-red-400'}`}>
                      {carry >= 0 ? '+' : ''}{formatCurrency(carry)}
                    </span>
                  </div>
                )}
                {hasData && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Entradas do mês</span>
                    <span className="font-medium text-success dark:text-emerald-400">+{formatCurrency(row.entradas)}</span>
                  </div>
                )}
                {hasData && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Saídas do mês</span>
                    <span className="font-medium text-danger dark:text-red-400">-{formatCurrency(row.saidas)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs pt-1.5 border-t border-slate-200 dark:border-slate-600">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">= Acumulado</span>
                  <span className={`font-bold ${saldoAcum >= 0 ? 'text-primary dark:text-blue-300' : 'text-danger dark:text-red-400'}`}>
                    {formatCurrency(saldoAcum)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Total anual */}
      <div className="grid grid-cols-4 px-4 py-3 bg-slate-50 dark:bg-slate-700 border-t border-slate-200 dark:border-slate-600">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Ano</span>
        <span className={`text-xs font-bold text-right ${totSaldo >= 0 ? 'text-primary dark:text-blue-300' : 'text-danger dark:text-red-400'}`}>
          {formatCurrency(totSaldo)}
        </span>
        <span className="text-xs font-bold text-danger dark:text-red-400 text-right">{formatCurrency(totSaidas)}</span>
        <span className={`text-xs font-bold text-right ${totSaldo >= 0 ? 'text-success dark:text-emerald-400' : 'text-danger dark:text-red-400'}`}>
          {formatCurrency(totEntradas - totSaidas)}
        </span>
      </div>
    </div>
  )
}

// ─── Breakdown por categoria ─────────────────────────────────────────────────

function CategoryBreakdown({ categoryData, categories }) {
  const rows = Object.entries(categoryData)
    .map(([cat, vals]) => ({ cat, value: vals?.saidas ?? 0 }))
    .filter(r => r.value > 0)
    .sort((a, b) => b.value - a.value)

  const totalSaidas = rows.reduce((s, r) => s + r.value, 0)

  if (rows.length === 0) return null

  return (
    <div className="mx-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Saídas por categoria no ano</h3>
      <div className="space-y-3.5">
        {rows.map(({ cat, value }, idx) => {
          const pct = totalSaidas > 0 ? (value / totalSaidas) * 100 : 0
          const meta = getCatMeta(cat, categories)
          const barColor = BAR_COLORS[idx % BAR_COLORS.length]
          return (
            <div key={cat}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <span>{meta.icon}</span> {cat}
                </span>
                <div className="text-right">
                  <span className="text-sm font-semibold text-danger">{formatCurrency(value)}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1.5">{pct.toFixed(0)}%</span>
                </div>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${barColor}`}
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
  const { isDark, toggleTheme } = useTheme()
  const { categories } = useCategories()
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [monthlyData, setMonthlyData] = useState(
    Array.from({ length: 12 }, () => ({ entradas: 0, saidas: 0 }))
  )
  const [categoryData, setCategoryData] = useState({})

  const handleExportCSV = () => {
    const saldosAcum = monthlyData.reduce((acc, m) => {
      const prev = acc.length > 0 ? acc[acc.length - 1] : 0
      acc.push(prev + m.entradas - m.saidas)
      return acc
    }, [])
    const headers = ['Mês', 'Entradas (R$)', 'Saídas (R$)', 'Saldo acumulado (R$)']
    const rows = monthlyData.map((m, i) => [
      MONTH_FULL[i],
      formatCSVCurrency(m.entradas),
      formatCSVCurrency(m.saidas),
      formatCSVCurrency(saldosAcum[i]),
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

      data.forEach(l => {
        const m = parseInt(l.data_vencimento.split('-')[1]) - 1
        const v = Number(l.valor)
        if (!byCat[l.categoria]) byCat[l.categoria] = { entradas: 0, saidas: 0 }
        if (l.tipo === 'Entrada') {
          byMonth[m].entradas += v
          byCat[l.categoria].entradas += v
        } else {
          byMonth[m].saidas += v
          byCat[l.categoria].saidas += v
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
    <div className="min-h-screen bg-background pb-36 page-enter">
      {/* Header */}
      <div className="bg-primary text-white px-4 pt-safe pb-5 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold">Resumo Anual</h1>
          <div className="flex items-center gap-2">
            <SkyToggle checked={isDark} onChange={toggleTheme} />
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
          <h3 className="text-slate-700 dark:text-slate-200 font-semibold mb-1">Nenhum registro em {year}</h3>
          <p className="text-slate-400 dark:text-slate-500 text-sm">Navegue para outro ano ou adicione lançamentos.</p>
        </div>
      ) : (
        <div className="space-y-3 py-4">
          <LineChart monthlyData={monthlyData} />
          <MonthlyTable monthlyData={monthlyData} currentYear={year} />
          <CategoryBreakdown categoryData={categoryData} categories={categories} />
        </div>
      )}
    </div>
  )
}
