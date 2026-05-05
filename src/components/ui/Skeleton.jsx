export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded-xl ${className}`} />
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      {/* Chart */}
      <Skeleton className="h-48" />
      {/* Table */}
      <Skeleton className="h-40" />
    </div>
  )
}
