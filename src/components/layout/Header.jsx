import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { supabase } from '../../lib/supabase'
import MonthYearPicker from '../ui/MonthYearPicker'
import SkyToggle from '../ui/SkyToggle'

const COUPLE_PHOTO = '/foto-casal.jpg'

export default function Header({ year, month, onPrevMonth, onNextMonth, onGoToToday, onChangeMonth, onOpenPerfil }) {
  const { user, signOut, updateUserMeta } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const name = user?.user_metadata?.full_name || user?.email || 'Usuário'
  const firstName = name.split(' ')[0]
  const [photoError, setPhotoError] = useState(false)
  const [avatar, setAvatar] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  // Carrega avatar ao montar/trocar usuário
  useEffect(() => {
    if (!user) return

    // 1. Mostra localStorage imediatamente (sem esperar rede)
    const local = localStorage.getItem(`avatar_${user.id}`)
    if (local) setAvatar(local)

    // 2. Verifica metadados do Supabase (fonte autoritativa, sincronizada)
    const metaUrl = user?.user_metadata?.avatar_url
    if (metaUrl) {
      const ts = user?.user_metadata?.avatar_updated ?? ''
      const urlFinal = metaUrl + (metaUrl.includes('?') ? '&' : '?') + 'cb=' + ts
      setAvatar(urlFinal)
      // Mantém localStorage sincronizado
      localStorage.setItem(`avatar_${user.id}`, metaUrl)
    }
  }, [user])

  const handleAvatarClick = () => {
    if (!uploading) fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setUploading(true)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = async () => {
        // Redimensiona para 300x300 centralizado
        const canvas = document.createElement('canvas')
        canvas.width = 300
        canvas.height = 300
        const ctx = canvas.getContext('2d')
        const size = Math.min(img.width, img.height)
        const sx = (img.width - size) / 2
        const sy = (img.height - size) / 2
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 300, 300)

        canvas.toBlob(async (blob) => {
          try {
            const filePath = `${user.id}/avatar.jpg`

            // Upload para o Supabase Storage (upsert = sobrescreve se já existir)
            const { error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true })

            if (uploadError) throw uploadError

            // Pega a URL pública
            const { data: urlData } = supabase.storage
              .from('avatars')
              .getPublicUrl(filePath)

            const publicUrl = urlData.publicUrl
            const timestamp = Date.now().toString()

            // Salva URL nos metadados do usuário (sincroniza em todos os dispositivos)
            await updateUserMeta({ avatar_url: publicUrl, avatar_updated: timestamp })

            // Força refresh do token em cache — sem isso, a próxima página
            // carregaria os metadados antigos do JWT em localStorage
            await supabase.auth.refreshSession()

            // Atualiza localmente com cache-bust
            setAvatar(publicUrl + '?cb=' + timestamp)
            // Guarda no localStorage como cache offline
            localStorage.setItem(`avatar_${user.id}`, publicUrl)

          } catch (err) {
            console.error('Erro ao fazer upload da foto:', err)
            // Fallback: salva só no localStorage se o Storage falhar
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
            setAvatar(dataUrl)
            localStorage.setItem(`avatar_${user.id}`, dataUrl)
          } finally {
            setUploading(false)
          }
        }, 'image/jpeg', 0.85)
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
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
            {/* Avatar — toque para ir ao perfil */}
            <button
              onClick={() => onOpenPerfil ? onOpenPerfil() : handleAvatarClick()}
              className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white/40 flex-shrink-0 bg-white/10 active:scale-95 transition-transform"
              title="Meu perfil"
            >
              {/* Spinner enquanto faz upload */}
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
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
            <SkyToggle checked={isDark} onChange={toggleTheme} />
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
