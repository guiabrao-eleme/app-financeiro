import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import MonthYearPicker from '../ui/MonthYearPicker'

const COUPLE_PHOTO = '/foto-casal.jpg'

export default function Header({ year, month, onPrevMonth, onNextMonth, onGoToToday, onChangeMonth }) {
  const { user, signOut } = useAuth()
  const name = user?.user_metadata?.full_name || user?.email || 'Usuário'
  const firstName = name.split(' ')[0]
  const [photoError, setPhotoError] = useState(false)
  const [avatar, setAvatar] = useState(null)
  const fileInputRef = useRef(null)

  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  // Carrega avatar salvo no localStorage
  useEffect(() => {
    if (!user) return
    const saved = localStorage.getItem(`avatar_${user.id}`)
    if (saved) setAvatar(saved)
  }, [user])

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        // Redimensiona para 200x200 com corte centralizado (cover)
        const canvas = document.createElement('canvas')
        canvas.width = 200
        canvas.height = 200
        const ctx = canvas.getContext('2d')
        const size = Math.min(img.width, img.height)
        const sx = (img.width - size) / 2
        const sy = (img.height - size) / 2
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 200, 200)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
        setAvatar(dataUrl)
        localStorage.setItem(`avatar_${user.id}`, dataUrl)
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
    e.target.value = '' // permite selecionar o mesmo arquivo novamente
  }

  return (
    <header className="bg-primary text-white shadow-md relative">
      {/* Fundo com overflow-hidden isolado — não afeta dropdown do picker */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {!photoError && (
          <img
            src={COUPLE_PHOTO}
            alt=""
            onError={() => setPhotoError(true)}
            className="w-full h-full object-cover opacity-20 select-none"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/60 via-primary/80 to-primary" />
      </div>

      {/* Conteúdo — pt-safe respeita notch/Dynamic Island do iPhone */}
      <div className="relative px-4 pt-safe pb-5">

        {/* Input de arquivo oculto */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Avatar — toque para trocar foto */}
            <button
              onClick={handleAvatarClick}
              className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/40 flex-shrink-0 bg-white/10 active:scale-95 transition-transform"
              title="Toque para trocar sua foto"
            >
              {avatar ? (
                <img src={avatar} alt="Minha foto" className="w-full h-full object-cover" />
              ) : !photoError ? (
                <img
                  src={COUPLE_PHOTO}
                  alt="Foto"
                  onError={() => setPhotoError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                  {firstName[0]}
                </div>
              )}
            </button>
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
