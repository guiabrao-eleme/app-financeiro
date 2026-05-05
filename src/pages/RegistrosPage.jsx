import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { formatCurrency, formatDate, getMonthRange, formatMonthYear } from '../utils/format'
import { useToast } from '../components/ui/Toast'
import { Skeleton } from '../components/ui/Skeleton'
import NovoRegistroModal from '../components/forms/NovoRegistroModal'
import RecorrenciaEscopoSheet from '../components/ui/RecorrenciaEscopoSheet'
import MonthYearPicker from '../components/ui/MonthYearPicker'
import SkyToggle from '../components/ui/SkyToggle'
import { downloadCSV, formatCSVCurrency } from '../utils/csv'
import { useCategories, getCatMeta } from '../hooks/useCategories'
import { useCartoes, getCorMeta } from '../hooks/useCartoes'

const SORT_OPTIONS = [
  { id: 'data_desc',  label: '↓ Mais novo' },
  { id: 'data_asc',   label: '↑ Mais antigo' },
  { id: 'valor_desc', label: '↓ Maior valor' },
  { id: 'valor_asc',  label: '↑ Menor valor' },
]

const CHIPS_FIXOS = [
  { id: 'todos',       label: 'Todos' },
  { id: 'Entrada',     label: 'Entradas' },
  { id: 'Saída',       label: 'Só Saídas' },
  { id: 'recorrentes', label: '🔄 Recorrentes' },
  { id: 'parcelados',  label: '💳 Parcelados' },
]

const PAGE_SIZE = 30

function ListSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 dark:border-slate-700">
          <Skeleton className="w-10 h-10 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

function LancamentoItem({ item, onEdit, onDelete, selectionMode, selected, onToggleSelect, categories, cartoes }) {
  const meta = getCatMeta(item.categoria, categories)
  const cartao = cartoes?.find(c => c.id === item.cartao_id) ?? null
  const cartaoMeta = cartao ? getCorMeta(cartao.cor) : null
  const isEntrada = item.tipo === 'Entrada'
  const isRecorrente = item.tipo_repeticao === 'recorrente' && item.grupo_recorrente
  const isParcelado  = item.tipo_repeticao === 'parcelado'  && item.total_parcelas > 1

  return (
    <div
      className={`flex items-center gap-3 py-3 px-4 bg-white dark:bg-slate-800 border-b border-slate-50 dark:border-slate-700 transition-colors
        ${selectionMode ? 'cursor-pointer active:bg-slate-50 dark:active:bg-slate-700' : ''}
        ${selected ? 'bg-primary/5 dark:bg-primary/20 border-primary/10' : ''}`}
      onClick={selectionMode ? () => onToggleSelect(item.id) : undefined}
    >
      {/* Checkbox ou ícone */}
      {selectionMode ? (
        <div
          className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all
            ${selected ? 'bg-primary border-primary' : 'border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700'}`}
        >
          {selected && (
            <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      ) : (
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg ${meta.color}`}>
          {meta.icon}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{item.descricao}</p>
          {/* Badge recorrente */}
          {isRecorrente && (
            <span className="flex-shrink-0 text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-500 font-semibold px-1.5 py-0.5 rounded-full">
              🔄 recorrente
            </span>
          )}
          {/* Badge parcelado */}
          {isParcelado && (
            <span className="flex-shrink-0 text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-semibold px-1.5 py-0.5 rounded-full">
              {item.parcela_atual}/{item.total_parcelas}
            </span>
          )}
          {/* Legado: parcelado sem tipo_repeticao */}
          {!isRecorrente && !isParcelado && item.total_parcelas > 1 && (
            <span className="flex-shrink-0 text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-semibold px-1.5 py-0.5 rounded-full">
              {item.parcela_atual}/{item.total_parcelas}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {meta.icon} {item.categoria} · {formatDate(item.data_vencimento)}
          </p>
          {cartao && (
            <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cartaoMeta.bg} ${cartaoMeta.text}`}>
              {cartao.icone} {cartao.nome}
            </span>
          )}
        </div>
      </div>

      <p className={`text-sm font-bold flex-shrink-0 ${isEntrada ? 'text-success' : 'text-danger'}`}>
        {isEntrada ? '+' : '-'}{formatCurrency(item.valor)}
      </p>

      {!selectionMode && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(item) }}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 dark:text-slate-600 hover:text-primary hover:bg-primary/5 transition-colors flex-shrink-0"
            aria-label="Editar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onDelete(item) }}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 dark:text-slate-600 hover:text-danger hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
            aria-label="Excluir"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </>
      )}
    </div>
  )
}

export default function RegistrosPage({ showModal }) {
  const { user } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { addToast, ToastContainer } = useToast()
  const { categories } = useCategories()
  const { cartoes } = useCartoes()

  // Chips dinâmicos: fixos + categorias do usuário
  const chips = [
    ...CHIPS_FIXOS,
    ...categories.map(c => ({ id: c.nome, label: c.nome })),
  ]

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [allMonths, setAllMonths] = useState(false)

  const [allItems, setAllItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [chip, setChip] = useState('todos')
  const [sortBy, setSortBy] = useState('data_desc')
  const [page, setPage] = useState(1)

  // Edição
  const [editItem, setEditItem] = useState(null)
  const [editEscopo, setEditEscopo] = useState('apenas_este')

  // Seleção múltipla
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())

  // Seletor de escopo para edição ou exclusão recorrente
  // { item, action: 'editar' | 'excluir' }
  const [scopeTarget, setScopeTarget] = useState(null)

  // Refs para undo de delete
  const pendingDeletes = useRef({}) // id → { item, timer }

  const loaderRef = useRef(null)

  const prevMonth = () => {
    setAllMonths(false)
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    setAllMonths(false)
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }
  const goToToday = () => {
    setAllMonths(false)
    setYear(now.getFullYear())
    setMonth(now.getMonth() + 1)
  }
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  const fetchAll = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('lancamentos')
      .select('*')
      .eq('user_id', user.id)
      .order('data_vencimento', { ascending: false })
      .order('created_at', { ascending: false })

    if (!allMonths) {
      const { start, end } = getMonthRange(year, month)
      query = query.gte('data_vencimento', start).lte('data_vencimento', end)
    }

    const { data, error } = await query
    if (!error) setAllItems(data ?? [])
    setLoading(false)
  }, [user.id, year, month, allMonths])

  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    if (!showModal) fetchAll()
  }, [showModal, fetchAll])

  // Sair do modo seleção ao trocar filtros
  useEffect(() => {
    setSelectionMode(false)
    setSelectedIds(new Set())
  }, [search, chip, sortBy, year, month, allMonths])

  // Filtragem
  const filtered = allItems.filter(item => {
    const matchSearch = !search ||
      item.descricao.toLowerCase().includes(search.toLowerCase()) ||
      item.categoria.toLowerCase().includes(search.toLowerCase())
    const matchChip =
      chip === 'todos'       ? true :
      chip === 'Entrada'     ? item.tipo === 'Entrada' :
      chip === 'Saída'       ? item.tipo === 'Saída' :
      chip === 'recorrentes' ? item.tipo_repeticao === 'recorrente' :
      chip === 'parcelados'  ? item.tipo_repeticao === 'parcelado' :
      item.categoria === chip
    return matchSearch && matchChip
  })

  // Ordenação
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'data_asc':   return a.data_vencimento.localeCompare(b.data_vencimento)
      case 'data_desc':  return b.data_vencimento.localeCompare(a.data_vencimento)
      case 'valor_asc':  return Number(a.valor) - Number(b.valor)
      case 'valor_desc': return Number(b.valor) - Number(a.valor)
      default:           return 0
    }
  })

  const visible = sorted.slice(0, page * PAGE_SIZE)
  const hasMore = visible.length < sorted.length

  const totalSaidasVisiveis = visible
    .filter(i => i.tipo === 'Saída')
    .reduce((s, i) => s + Number(i.valor), 0)

  // Infinite scroll
  useEffect(() => {
    const el = loaderRef.current
    if (!el || !hasMore) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setPage(p => p + 1)
    }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, sorted.length])

  useEffect(() => { setPage(1) }, [search, chip, sortBy, year, month, allMonths])

  // ─── Soft delete de um item (com undo) ──────────────────────────────────────
  const softDelete = useCallback((item) => {
    setAllItems(prev => prev.filter(i => i.id !== item.id))
    setSelectedIds(prev => { const s = new Set(prev); s.delete(item.id); return s })

    if (pendingDeletes.current[item.id]) {
      clearTimeout(pendingDeletes.current[item.id].timer)
    }

    const timer = setTimeout(async () => {
      delete pendingDeletes.current[item.id]
      await supabase.from('lancamentos').delete().eq('id', item.id)
    }, 5000)

    pendingDeletes.current[item.id] = { item, timer }

    addToast(
      `"${item.descricao}" excluído`,
      'delete',
      () => {
        if (pendingDeletes.current[item.id]) {
          clearTimeout(pendingDeletes.current[item.id].timer)
          delete pendingDeletes.current[item.id]
        }
        setAllItems(prev => {
          const alreadyExists = prev.find(i => i.id === item.id)
          if (alreadyExists) return prev
          return [...prev, item].sort((a, b) => b.data_vencimento.localeCompare(a.data_vencimento))
        })
      }
    )
  }, [addToast])

  // ─── Soft delete de um grupo de itens (com undo) ────────────────────────────
  const softDeleteGroup = useCallback((items) => {
    const ids = items.map(i => i.id)

    setAllItems(prev => prev.filter(i => !ids.includes(i.id)))
    setSelectedIds(prev => { const s = new Set(prev); ids.forEach(id => s.delete(id)); return s })

    ids.forEach(id => {
      if (pendingDeletes.current[id]) clearTimeout(pendingDeletes.current[id].timer)
    })

    const timer = setTimeout(async () => {
      ids.forEach(id => delete pendingDeletes.current[id])
      await supabase.from('lancamentos').delete().in('id', ids)
    }, 5000)

    ids.forEach(id => {
      pendingDeletes.current[id] = { item: items.find(i => i.id === id), timer }
    })

    const n = ids.length
    addToast(
      `${n} ${n === 1 ? 'registro excluído' : 'registros excluídos'}`,
      'delete',
      () => {
        ids.forEach(id => {
          if (pendingDeletes.current[id]) {
            clearTimeout(pendingDeletes.current[id].timer)
            delete pendingDeletes.current[id]
          }
        })
        clearTimeout(timer)
        setAllItems(prev => {
          const existing = new Set(prev.map(i => i.id))
          const toAdd = items.filter(i => !existing.has(i.id))
          return [...prev, ...toAdd].sort((a, b) => b.data_vencimento.localeCompare(a.data_vencimento))
        })
      }
    )
  }, [addToast])

  // ─── Delete múltiplos selecionados ──────────────────────────────────────────
  const deleteSelected = useCallback(() => {
    const toRemove = [...selectedIds]
    const items = allItems.filter(i => toRemove.includes(i.id))

    setAllItems(prev => prev.filter(i => !toRemove.includes(i.id)))
    setSelectedIds(new Set())
    setSelectionMode(false)

    toRemove.forEach(id => {
      if (pendingDeletes.current[id]) clearTimeout(pendingDeletes.current[id].timer)
    })

    const timer = setTimeout(async () => {
      toRemove.forEach(id => delete pendingDeletes.current[id])
      await supabase.from('lancamentos').delete().in('id', toRemove)
    }, 5000)

    toRemove.forEach(id => { pendingDeletes.current[id] = { timer } })

    const n = toRemove.length
    addToast(
      `${n} ${n === 1 ? 'registro excluído' : 'registros excluídos'}`,
      'delete',
      () => {
        toRemove.forEach(id => {
          if (pendingDeletes.current[id]) {
            clearTimeout(pendingDeletes.current[id].timer)
            delete pendingDeletes.current[id]
          }
        })
        clearTimeout(timer)
        setAllItems(prev => {
          const existing = new Set(prev.map(i => i.id))
          const toAdd = items.filter(i => !existing.has(i.id))
          return [...prev, ...toAdd].sort((a, b) => b.data_vencimento.localeCompare(a.data_vencimento))
        })
      }
    )
  }, [selectedIds, allItems, addToast])

  // ─── Clique no botão editar ─────────────────────────────────────────────────
  const handleEditClick = useCallback((item) => {
    if (item.grupo_recorrente) {
      // Pergunta o escopo antes de abrir o formulário
      setScopeTarget({ item, action: 'editar' })
    } else {
      setEditEscopo('apenas_este')
      setEditItem(item)
    }
  }, [])

  // ─── Clique no botão excluir ────────────────────────────────────────────────
  const handleDeleteClick = useCallback((item) => {
    if (item.grupo_recorrente) {
      // Pergunta o escopo antes de excluir
      setScopeTarget({ item, action: 'excluir' })
    } else {
      softDelete(item)
    }
  }, [softDelete])

  // ─── Após escolher o escopo ─────────────────────────────────────────────────
  const handleScopeSelect = useCallback(async (scope) => {
    const { item, action } = scopeTarget
    setScopeTarget(null)

    if (action === 'editar') {
      setEditEscopo(scope)
      setEditItem(item)
    } else {
      // excluir
      if (scope === 'apenas_este') {
        softDelete(item)
      } else {
        // este_e_proximos: busca todos os registros futuros do grupo no banco
        const { data: futureRecords, error } = await supabase
          .from('lancamentos')
          .select('*')
          .eq('grupo_recorrente', item.grupo_recorrente)
          .gte('data_vencimento', item.data_vencimento)

        if (error || !futureRecords?.length) {
          // Fallback: exclui só este
          softDelete(item)
          return
        }

        softDeleteGroup(futureRecords)
      }
    }
  }, [scopeTarget, softDelete, softDeleteGroup])

  // Selecionar / desselecionar todos os visíveis
  const allVisibleSelected = visible.length > 0 && visible.every(i => selectedIds.has(i.id))

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(visible.map(i => i.id)))
    }
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  const handleExportCSV = () => {
    if (sorted.length === 0) { addToast('Nenhum registro para exportar.', 'info'); return }
    const label = allMonths ? `todos` : `${String(month).padStart(2,'0')}-${year}`
    const headers = ['Data Vencimento','Descrição','Tipo','Categoria','Valor (R$)','Parcela','Total Parcelas','Recorrente']
    const rows = sorted.map(i => [
      formatDate(i.data_vencimento),
      i.descricao,
      i.tipo,
      i.categoria,
      formatCSVCurrency(i.valor),
      i.parcela_atual,
      i.total_parcelas,
      i.tipo_repeticao ?? '',
    ])
    downloadCSV(`registros-${label}.csv`, headers, rows)
    addToast('CSV exportado com sucesso!', 'success')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col page-enter">
      <ToastContainer />

      {/* Header */}
      <div className="bg-primary text-white px-4 pt-safe pb-4 shadow-md flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold">Registros</h1>
          <div className="flex items-center gap-2">
            {!allMonths && !isCurrentMonth && (
              <button
                onClick={goToToday}
                className="text-white/90 text-xs bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition-colors font-medium"
              >
                Hoje
              </button>
            )}
            <button
              onClick={() => { setAllMonths(v => !v); setPage(1) }}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors font-medium border
                ${allMonths
                  ? 'bg-white text-primary border-white'
                  : 'text-white/80 border-white/20 hover:bg-white/10'}`}
            >
              Todos
            </button>
            <SkyToggle checked={isDark} onChange={toggleTheme} />
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
          </div>
        </div>

        {/* Navegação de mês */}
        {!allMonths && (
          <div className="flex items-center justify-between bg-white/10 rounded-2xl px-2 py-2 mb-3">
            <button
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors text-lg"
            >
              ‹
            </button>
            <MonthYearPicker
              year={year}
              month={month}
              onChange={(y, m) => { setYear(y); setMonth(m); setAllMonths(false) }}
              variant="dark"
            />
            <button
              onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors text-lg"
            >
              ›
            </button>
          </div>
        )}

        {/* Barra de busca */}
        <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-white/50 flex-shrink-0">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por descrição ou categoria..."
            className="flex-1 bg-transparent text-sm text-white placeholder-white/40 outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-white/50 hover:text-white">✕</button>
          )}
        </div>
      </div>

      {/* Chips de filtro */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-none flex-shrink-0 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
        {chips.map(c => (
          <button
            key={c.id}
            onClick={() => setChip(c.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all
              ${chip === c.id
                ? 'bg-primary text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Barra de ordenação + seleção */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
        <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">Ordenar:</span>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none flex-1">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setSortBy(opt.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${sortBy === opt.id
                  ? 'bg-primary/10 dark:bg-primary/20 text-primary border border-primary/20'
                  : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {/* Botão modo seleção */}
        <button
          onClick={() => {
            setSelectionMode(v => !v)
            setSelectedIds(new Set())
          }}
          className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border
            ${selectionMode
              ? 'bg-primary text-white border-primary'
              : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'}`}
        >
          {selectionMode ? 'Cancelar' : 'Selecionar'}
        </button>
      </div>

      {/* Barra de seleção múltipla */}
      {selectionMode && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-primary/5 dark:bg-primary/20 border-b border-primary/10 flex-shrink-0">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-sm font-medium text-primary"
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all
              ${allVisibleSelected ? 'bg-primary border-primary' : 'border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700'}`}>
              {allVisibleSelected && (
                <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                  <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            {allVisibleSelected ? 'Desmarcar todos' : 'Selecionar todos'}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">{selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}</span>
            {selectedIds.size > 0 && (
              <button
                onClick={deleteSelected}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger text-white text-xs font-semibold"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Excluir ({selectedIds.size})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="flex-1 overflow-y-auto pb-40">
        {loading ? (
          <ListSkeleton />
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-8">
            <svg viewBox="0 0 120 120" className="w-32 h-32 mb-4" fill="none">
              <circle cx="60" cy="60" r="54" fill="#F1F5F9"/>
              <rect x="34" y="38" width="52" height="44" rx="6" fill="white" stroke="#CBD5E1" strokeWidth="2"/>
              <path d="M44 54h32M44 63h20M44 72h24" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="82" cy="82" r="14" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="2"/>
              <path d="M78 82h8M82 78v8" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <p className="text-slate-600 dark:text-slate-300 font-semibold">Nenhum registro encontrado</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
              {search || chip !== 'todos' ? 'Tente mudar os filtros ou a busca' : 'Toque no + para adicionar um lançamento'}
            </p>
          </div>
        ) : (
          <>
            {visible.map(item => (
              <LancamentoItem
                key={item.id}
                item={item}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                selectionMode={selectionMode}
                selected={selectedIds.has(item.id)}
                onToggleSelect={toggleSelect}
                categories={categories}
                cartoes={cartoes}
              />
            ))}
            {hasMore && (
              <div ref={loaderRef} className="py-4 flex justify-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Rodapé totalizador — padding right para não sobrepor o botão + */}
      {!loading && visible.length > 0 && !selectionMode && (
        <div className="fixed bottom-16 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 pl-4 pr-20 py-3 flex items-center justify-between z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {visible.length} {visible.length === 1 ? 'registro' : 'registros'}
          </span>
          <div className="text-right">
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Total saídas visíveis</p>
            <p className="text-sm font-bold text-danger">{formatCurrency(totalSaidasVisiveis)}</p>
          </div>
        </div>
      )}

      {/* Modal de edição */}
      <NovoRegistroModal
        open={!!editItem}
        onClose={() => setEditItem(null)}
        onSaved={() => { fetchAll(); setEditItem(null) }}
        editItem={editItem}
        editEscopo={editEscopo}
      />

      {/* Sheet de escopo para recorrentes */}
      <RecorrenciaEscopoSheet
        open={!!scopeTarget}
        onClose={() => setScopeTarget(null)}
        action={scopeTarget?.action}
        descricao={scopeTarget?.item?.descricao}
        onSelect={handleScopeSelect}
      />
    </div>
  )
}
