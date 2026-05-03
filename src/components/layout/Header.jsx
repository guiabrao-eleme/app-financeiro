import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import MonthYearPicker from '../ui/MonthYearPicker'

const COUPLE_PHOTO = '/foto-casal.jpg' // coloque a foto em public/foto-casal.jpg

export default function Header({ year, month, onPrevMonth, onNextMonth, onGoToToday, onChangeMonth }) {
  const { user, signOut } = useAuth()
  const name = user?.user_metadata?.full_name || user?.email || 'Usuário'
  const firstName = name.split(' ')[0]
  const [photoError, setPhotoError] = useState(false)

  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  return (
    <header className="bg-primary text-white shadow-md relative overflow-hidden">
      {/* Foto do casal como fundo sutil */}
      {!photoError && (
        <img
          src={COUPLE_PHOTO}
          alt=""
          onError={() => setPhotoError(true)}
          className="absolute inset-0 w-full h-full object-cover opacity-20 select-none pointer-events-none"
          aria-hidden="true"
        />
      )}

      {/* Gradiente para legibilidade */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/60 via-primary/80 to-primary pointer-events-none" />

      {/* Conteúdo */}
      <div className="relative px-4 pt-10 pb-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Foto circular ou inicial */}
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30 flex-shrink-0 bg-white/10">
              {!photoError ? (
                <img
                  src={COUPLE_PHOTO}
                  alt="Foto do casal"
                  onError={() => setPhotoError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                  {firstName[0]}
                </div>
              )}
            </div>
            <div>
              <p className="text-white/60 text-xs font-medium uppercase tracking-wide leading-none mb-0.5">Bem-vindo</p>
              <h1 className="text-base font-bold leading-tight">{firstName}</h1>
            </div>
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
            onChange={onChangeMonth}
            variant="dark"
          />
          <button
            onClick={onNextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors text-lg"
          >
            ›
          </button>
        </div>
      </div>
    </header>
  )
}
