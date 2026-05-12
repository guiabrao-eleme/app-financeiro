import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { formatCurrency } from '../utils/format'
import { useCategories, getCatMeta } from '../hooks/useCategories'
import { useCartoes, getCorMeta } from '../hooks/useCartoes'
import { downloadICS } from '../utils/ics'
import { useToast } from '../components/ui/Toast'
import SkyToggle from '../components/ui/SkyToggle'
import MonthYearPicker from '../components/ui/MonthYearPicker'

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]
const DAY_HEADERS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

// ─── Sheet de opções de exportação ───────────────────────────────────────────
function ExportSheet({ open, onClose, onExportAll, onExportNotify, loading }) {
  if (!open) return null
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 rounded-t-3xl z-50 pb-safe">
        <div className="w-10 h-1 bg-slate-200 dark:bg-slate-600 rounded-full mx-auto mt-3 mb-4" />
        <div className="px-4 pb-6 space-y-3">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
            📲 Exportar para Google Calendar
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed mb-3">
            Baixa um arquivo <strong>.ics</strong> que pode ser importado no Google Calendar,
            Apple Calendar, Outlook e qualquer outro app de agenda.
          </p>

          <button
            onClick={onExportNotify}
            disabled={loading}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-primary/10 dark:bg-primary/20 border border-primary/20 text-left hover:bg-primary/15 transition-colors disabled:opacity-50"
          >
            <span className="text-2xl">🔔</span>
            <div>
              <p className="text-sm font-semibold text-primary">Só com aviso ativado</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Exporta apenas os lançamentos com notificação configurada</p>
            </div>
          </button>

          <button
            onClick={onExportAll}
            disabled={loading}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-left hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
          >
            <span className="text-2xl">📅</span>
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Todos os lançamentos</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Exporta todos os registros do app</p>
            </div>
          </button>

          <button onClick={onClose} className="w-full py-3 text-sm text-slate-400 dark:text-slate-500 font-medium">
            Cancelar
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Página de calendário ─────────────────────────────────────────────────────
export default function CalendarioPage() {
  const { user } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { categories } = useCategories()
  const { cartoes } = useCartoes()
  const { addToast, ToastContainer } = useToast()

  const now = new Date()
  const [year, setYear]         = useState(now.getFullYear())
  const [month, setMonth]       = useState(now.getMonth() + 1)
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [selectedDay, setSelectedDay] = useState(now.getDate())
  const [showExport, setShowExport]   = useState(false)
  const [exporting, setExporting]     = useState(false)

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  // ── Busca lançamentos do mês ──────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    setLoading(true)
    const daysInMonth = new Date(year, month, 0).getDate()
    const start = `${year}-${String(month).padStart(2,'0')}-01`
    const end   = `${year}-${String(month).padStart(2,'0')}-${String(daysInMonth).padStart(2,'0')}`
    const { data } = await supabase
      .from('lancamentos')
      .select('*')
      .eq('user_id', user.id)
      .gte('data_vencimento', start)
      .lte('data_vencimento', end)
      .order('data_vencimento', { ascending: true })
    setItems(data ?? [])
    setLoading(false)
  }, [user.id, year, month])

  useEffect(() => { fetchItems() }, [fetchItems])

  // Reseta dia selecionado ao trocar mês
  useEffect(() => {
    setSelectedDay(isCurrentMonth ? now.getDate() : 1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month])

  // ── Agrupa por dia ────────────────────────────────────────────────────────
  const byDay = {}
  for (const item of items) {
    const d = parseInt(item.data_vencimento.split('-')[2])
    if (!byDay[d]) byDay[d] = []
    byDay[d].push(item)
  }

  // ── Células do calendário ─────────────────────────────────────────────────
  const daysInMonth   = new Date(year, month, 0).getDate()
  const firstWeekday  = new Date(year, month - 1, 1).getDay() // 0=Dom
  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const todayNum = isCurrentMonth ? now.getDate() : null

  // ── Navegação ─────────────────────────────────────────────────────────────
  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  // ── Totais do mês ─────────────────────────────────────────────────────────
  const totalEntradas = items.filter(i => i.tipo === 'Entrada').reduce((s,i) => s + Number(i.valor), 0)
  const totalSaidas   = items.filter(i => i.tipo === 'Saída').reduce((s,i) => s + Number(i.valor), 0)

  // ── Lançamentos do dia selecionado ────────────────────────────────────────
  const selectedItems = selectedDay ? [...(byDay[selectedDay] ?? [])].sort((a,b) => a.descricao.localeCompare(b.descricao)) : []

  // ── Exportação ICS ────────────────────────────────────────────────────────
  const handleExportNotify = async () => {
    setExporting(true)
    const { data } = await supabase
      .from('lancamentos')
      .select('*')
      .eq('user_id', user.id)
      .eq('notificar', true)
    setExporting(false)
    setShowExport(false)
    if (!data?.length) {
      addToast('Nenhum lançamento com aviso ativado encontrado.', 'info')
      return
    }
    downloadICS('financas-avisos.ics', data)
    addToast(`${data.length} eventos exportados! Importe o arquivo no Google Calendar.`, 'success')
  }

  const handleExportAll = async () => {
    setExporting(true)
    const { data } = await supabase
      .from('lancamentos')
      .select('*')
      .eq('user_id', user.id)
    setExporting(false)
    setShowExport(false)
    if (!data?.length) {
      addToast('Nenhum lançamento encontrado.', 'info')
      return
    }
    downloadICS('financas-todos.ics', data)
    addToast(`${data.length} eventos exportados! Importe o arquivo no Google Calendar.`, 'success')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col page-enter">
      <ToastContainer />

      {/* ── Header ── */}
      <div className="bg-primary text-white px-4 pt-safe pb-4 shadow-md flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold">📅 Agenda</h1>
          <div className="flex items-center gap-2">
            <SkyToggle checked={isDark} onChange={toggleTheme} />
            <button
              onClick={() => setShowExport(true)}
              className="flex items-center gap-1.5 text-xs bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path d="M8 17l4 4 4-4M12 12v9" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Google Cal
            </button>
          </div>
        </div>

        {/* Navegação de mês */}
        <div className="flex items-center justify-between bg-white/10 rounded-2xl px-2 py-2">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors text-lg">‹</button>
          <MonthYearPicker year={year} month={month} onChange={(y,m) => { setYear(y); setMonth(m) }} variant="dark" />
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors text-lg">›</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-36">

        {/* ── Totais do mês ── */}
        <div className="flex gap-3 px-4 pt-4 pb-2">
          <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl px-3 py-2.5 text-center">
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wide">Entradas</p>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalEntradas)}</p>
          </div>
          <div className="flex-1 bg-red-50 dark:bg-red-900/20 rounded-2xl px-3 py-2.5 text-center">
            <p className="text-[10px] text-red-500 dark:text-red-400 font-medium uppercase tracking-wide">Saídas</p>
            <p className="text-sm font-bold text-red-500 dark:text-red-400">{formatCurrency(totalSaidas)}</p>
          </div>
          <div className="flex-1 bg-slate-50 dark:bg-slate-700/50 rounded-2xl px-3 py-2.5 text-center">
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wide">Saldo</p>
            <p className={`text-sm font-bold ${totalEntradas - totalSaidas >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
              {formatCurrency(totalEntradas - totalSaidas)}
            </p>
          </div>
        </div>

        {/* ── Grid do calendário ── */}
        <div className="mx-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden mb-4">

          {/* Cabeçalho dias da semana */}
          <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
            {DAY_HEADERS.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 py-2 tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Células */}
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-300 dark:text-slate-600 text-sm">
              Carregando...
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                if (!day) {
                  return (
                    <div
                      key={`empty-${i}`}
                      className="h-14 border-b border-r border-slate-50 dark:border-slate-700/40"
                    />
                  )
                }

                const dayItems  = byDay[day] ?? []
                const hasEntr   = dayItems.some(x => x.tipo === 'Entrada')
                const hasSaida  = dayItems.some(x => x.tipo === 'Saída')
                const isToday   = day === todayNum
                const isSel     = day === selectedDay
                const colIndex  = i % 7 // 0=Dom, 6=Sáb — remove border-right on last col
                const isLastCol = colIndex === 6

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(isSel ? null : day)}
                    className={`relative h-14 flex flex-col items-center pt-1.5 pb-1 border-b transition-colors
                      ${isLastCol ? '' : 'border-r'}
                      border-slate-50 dark:border-slate-700/40
                      ${isSel
                        ? 'bg-primary/10 dark:bg-primary/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 active:bg-slate-100 dark:active:bg-slate-700'}`}
                  >
                    {/* Número do dia */}
                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full
                      ${isToday
                        ? 'bg-primary text-white'
                        : isSel
                          ? 'text-primary'
                          : 'text-slate-700 dark:text-slate-300'}`}
                    >
                      {day}
                    </span>

                    {/* Dots de tipo */}
                    {dayItems.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {hasEntr  && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                        {hasSaida && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
                      </div>
                    )}

                    {/* Contagem quando > 2 */}
                    {dayItems.length > 2 && (
                      <span className="text-[8px] leading-none text-slate-400 dark:text-slate-500 mt-0.5">
                        {dayItems.length}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Lançamentos do dia selecionado ── */}
        {selectedDay && (
          <div className="px-4">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              {selectedDay} de {MONTHS[month - 1]}
              {selectedItems.length > 0 && (
                <span className="ml-2 normal-case font-normal text-slate-400 dark:text-slate-500">
                  · {selectedItems.length} {selectedItems.length === 1 ? 'lançamento' : 'lançamentos'}
                </span>
              )}
            </p>

            {selectedItems.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
                Nenhum vencimento neste dia 🎉
              </div>
            ) : (
              <div className="space-y-2">
                {selectedItems.map(item => {
                  const meta     = getCatMeta(item.categoria, categories)
                  const cartao   = cartoes?.find(c => c.id === item.cartao_id) ?? null
                  const cartaoMeta = cartao ? getCorMeta(cartao.cor) : null
                  const isEntr   = item.tipo === 'Entrada'

                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-2xl px-3 py-3 border border-slate-100 dark:border-slate-700"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${meta.color}`}>
                        {meta.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {item.descricao}
                          </p>
                          {item.tipo_repeticao === 'recorrente' && (
                            <span className="text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-500 font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0">
                              🔄
                            </span>
                          )}
                          {item.notificar && (
                            <span className="text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-500 font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0">
                              🔔 {item.dias_aviso}d
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <p className="text-xs text-slate-400 dark:text-slate-500">{meta.icon} {item.categoria}</p>
                          {cartao && (
                            <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cartaoMeta.bg} ${cartaoMeta.text}`}>
                              {cartao.icone} {cartao.nome}
                            </span>
                          )}
                        </div>
                      </div>

                      <p className={`text-sm font-bold flex-shrink-0 ${isEntr ? 'text-emerald-500' : 'text-red-500'}`}>
                        {isEntr ? '+' : '-'}{formatCurrency(item.valor)}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Lista de todos os vencimentos do mês (quando nenhum dia selecionado) ── */}
        {!selectedDay && !loading && items.length > 0 && (
          <div className="px-4">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              Todos os vencimentos — {MONTHS[month - 1]}
            </p>
            <div className="space-y-2">
              {items.map(item => {
                const meta   = getCatMeta(item.categoria, categories)
                const isEntr = item.tipo === 'Entrada'
                const day    = parseInt(item.data_vencimento.split('-')[2])
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-2xl px-3 py-3 border border-slate-100 dark:border-slate-700"
                  >
                    <div className="flex-shrink-0 w-9 text-center">
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-none">dia</p>
                      <p className="text-base font-bold text-primary leading-tight">{day}</p>
                    </div>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${meta.color}`}>
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{item.descricao}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{item.categoria}</p>
                    </div>
                    <p className={`text-sm font-bold flex-shrink-0 ${isEntr ? 'text-emerald-500' : 'text-red-500'}`}>
                      {isEntr ? '+' : '-'}{formatCurrency(item.valor)}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {!loading && items.length === 0 && !selectedDay && (
          <div className="text-center py-16 px-8">
            <p className="text-4xl mb-3">📅</p>
            <p className="text-slate-600 dark:text-slate-300 font-semibold">Nenhum lançamento em {MONTHS[month - 1]}</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Toque no + para adicionar um registro</p>
          </div>
        )}
      </div>

      {/* ── Sheet de exportação ── */}
      <ExportSheet
        open={showExport}
        onClose={() => setShowExport(false)}
        onExportNotify={handleExportNotify}
        onExportAll={handleExportAll}
        loading={exporting}
      />
    </div>
  )
}
