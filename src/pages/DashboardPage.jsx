import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getMonthRange } from '../utils/format'
import Header from '../components/layout/Header'
import SummaryCards from '../components/dashboard/SummaryCards'
import CategoryChart from '../components/dashboard/CategoryChart'
import CategoryTable from '../components/dashboard/CategoryTable'
import { useCategories } from '../hooks/useCategories'

function buildCategoryData(lancamentos) {
  const data = {}
  lancamentos.forEach(l => {
    if (!data[l.categoria]) data[l.categoria] = { entradas: 0, saidas: 0 }
    if (l.tipo === 'Entrada') data[l.categoria].entradas += Number(l.valor)
    else data[l.categoria].saidas += Number(l.valor)
  })
  return data
}

export default function DashboardPage({ showModal }) {
  const { user } = useAuth()
  const { categories } = useCategories()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [lancamentos, setLancamentos] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { start, end } = getMonthRange(year, month)
    const { data, error } = await supabase
      .from('lancamentos')
      .select('tipo, categoria, valor')
      .eq('user_id', user.id)
      .gte('data_vencimento', start)
      .lte('data_vencimento', end)
    if (!error) setLancamentos(data ?? [])
    setLoading(false)
  }, [year, month, user.id])

  useEffect(() => { fetchData() }, [fetchData])

  // Recarrega quando o modal fecha (após salvar)
  useEffect(() => {
    if (!showModal) fetchData()
  }, [showModal, fetchData])

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }
  const goToToday = () => {
    const now = new Date()
    setYear(now.getFullYear())
    setMonth(now.getMonth() + 1)
  }
  const changeMonth = (y, m) => {
    setYear(y)
    setMonth(m)
  }

  const entradas = lancamentos.filter(l => l.tipo === 'Entrada').reduce((s, l) => s + Number(l.valor), 0)
  const saidas = lancamentos.filter(l => l.tipo === 'Saída').reduce((s, l) => s + Number(l.valor), 0)
  const categoryData = buildCategoryData(lancamentos)

  return (
    <div className="min-h-screen bg-background pb-24 page-enter">
      <Header year={year} month={month} onPrevMonth={prevMonth} onNextMonth={nextMonth} onGoToToday={goToToday} onChangeMonth={changeMonth} />

      <SummaryCards entradas={entradas} saidas={saidas} loading={loading} />

      {!loading && lancamentos.length > 0 && (
        <div className="space-y-3">
          <CategoryChart data={categoryData} loading={loading} categories={categories} />
          <CategoryTable data={categoryData} totalSaidas={saidas} loading={loading} categories={categories} />
        </div>
      )}

      {!loading && lancamentos.length === 0 && (
        <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-4xl">📊</span>
          </div>
          <h3 className="text-slate-700 font-semibold mb-1">Nenhum registro neste mês</h3>
          <p className="text-slate-400 text-sm">
            Toque no <strong>+</strong> para adicionar seu primeiro lançamento.
          </p>
        </div>
      )}
    </div>
  )
}
