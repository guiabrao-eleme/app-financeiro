import { formatCurrency } from '../../utils/format'
import { Skeleton } from '../ui/Skeleton'

function Card({ label, value, colorClass, bgClass, loading }) {
  if (loading) return <Skeleton className="h-20" />
  return (
    <div className={`rounded-2xl p-3 ${bgClass}`}>
      <p className={`text-xs font-medium mb-1 ${colorClass} opacity-70`}>{label}</p>
      <p className={`text-sm font-bold ${colorClass} leading-tight`}>
        {formatCurrency(value)}
      </p>
    </div>
  )
}

export default function SummaryCards({ entradas, saidas, loading }) {
  const saldo = entradas - saidas

  return (
    <div className="grid grid-cols-3 gap-3 px-4 py-4">
      <Card
        label="Entradas"
        value={entradas}
        colorClass="text-success dark:text-emerald-400"
        bgClass="bg-emerald-50 dark:bg-emerald-900/20"
        loading={loading}
      />
      <Card
        label="Saídas"
        value={saidas}
        colorClass="text-danger dark:text-red-400"
        bgClass="bg-red-50 dark:bg-red-900/20"
        loading={loading}
      />
      <Card
        label="Saldo"
        value={saldo}
        colorClass={saldo >= 0 ? 'text-primary dark:text-blue-300' : 'text-danger dark:text-red-400'}
        bgClass="bg-blue-50 dark:bg-blue-900/20"
        loading={loading}
      />
    </div>
  )
}
