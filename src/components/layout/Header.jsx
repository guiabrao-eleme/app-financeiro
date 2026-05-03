import { useAuth } from '../../contexts/AuthContext'
import MonthYearPicker from '../ui/MonthYearPicker'

export default function Header({ year, month, onPrevMonth, onNextMonth, onGoToToday, onChangeMonth }) {
  const { user, signOut } = useAuth()
  const name = user?.user_metadata?.full_name || user?.email || 'Usuário'
  const firstName = name.split(' ')[0]

  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  return (
    <header className="bg-primary text-white px-4 pt-10 pb-5 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-white/60 text-xs font-medium uppercase tracking-wide">Bem-vindo</p>
          <h1 className="text-lg font-bold leading-tight">{firstName}</h1>
        </div>
        <div className="flex items-center gap-2">
          {!isCurrentMonth && (
            <button
              onClick={onGoToToday}
              className="text-white/90 hover:text-white text-xs bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              Hoje
            </button>
          )}
          <button
            onClick={signOut}
            className="text-white/70 hover:text-white text-xs border border-white/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            Sair
          </button>
        </div>
      </div>

      {/* Navegação de mês */}
      <div className="flex items-center justify-between bg-white/10 rounded-2xl px-2 py-2">
        <button
          onClick={onPrevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors text-lg"
        >
          ‹
        </button>
        <MonthYearPicker
          year={year}
          month={month}
          onChange={(y, m) => { onChangeMonth(y, m) }}
          variant="dark"
        />
        <button
          onClick={onNextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors text-lg"
        >
          ›
        </button>
      </div>
    </header>
  )
}
