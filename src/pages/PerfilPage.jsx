import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useCartoes, getCorMeta } from '../hooks/useCartoes'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { useGoogleCalendar } from '../hooks/useGoogleCalendar'

const EMOJIS_BANCO = [
  '🏦','💳','💵','💴','💶','💷','🪙','💰','🏧','📲',
  '🟣','🟢','🔵','🟡','🟠','🔴','⚫','🟤',
]

const CORES_BANCO = [
  { id: 'slate',  label: 'Cinza',    dot: 'bg-slate-400' },
  { id: 'purple', label: 'Roxo',     dot: 'bg-purple-500' },
  { id: 'blue',   label: 'Azul',     dot: 'bg-blue-500' },
  { id: 'green',  label: 'Verde',    dot: 'bg-green-500' },
  { id: 'pink',   label: 'Rosa',     dot: 'bg-pink-500' },
  { id: 'orange', label: 'Laranja',  dot: 'bg-orange-500' },
  { id: 'red',    label: 'Vermelho', dot: 'bg-red-500' },
  { id: 'yellow', label: 'Amarelo',  dot: 'bg-yellow-400' },
]

// ─── Formulário de adição de cartão no perfil ─────────────────────────────────
function NewCartaoInProfile({ onCreated, onCancel, createCartao }) {
  const [nome, setNome] = useState('')
  const [icone, setIcone] = useState('🏦')
  const [cor, setCor] = useState('slate')
  const [diaVencimento, setDiaVencimento] = useState(1)
  const [diasAviso, setDiasAviso] = useState(3)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100) }, [])

  const handleSave = async () => {
    if (!nome.trim()) return
    setSaving(true)
    const { data, error } = await createCartao({
      nome,
      icone,
      cor,
      dia_vencimento: diaVencimento,
      dias_aviso_fatura: diasAviso,
    })
    setSaving(false)
    if (!error && data) onCreated(data)
  }

  return (
    <div className="mt-3 bg-slate-50 dark:bg-slate-700 rounded-2xl p-4 border border-slate-200 dark:border-slate-600 space-y-4">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Novo cartão / conta</p>

      {/* Emojis */}
      <div className="flex flex-wrap gap-1.5">
        {EMOJIS_BANCO.map(e => (
          <button
            key={e} type="button" onClick={() => setIcone(e)}
            className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all
              ${icone === e ? 'bg-primary/15 ring-2 ring-primary scale-110' : 'bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500'}`}
          >
            {e}
          </button>
        ))}
      </div>

      {/* Cores */}
      <div className="flex gap-2 flex-wrap">
        {CORES_BANCO.map(c => (
          <button
            key={c.id} type="button" onClick={() => setCor(c.id)}
            className={`w-7 h-7 rounded-full ${c.dot} transition-all
              ${cor === c.id ? 'ring-2 ring-offset-2 ring-slate-500 scale-110' : 'opacity-60 hover:opacity-100'}`}
            title={c.label}
          />
        ))}
      </div>

      {/* Nome */}
      <div className="flex items-center gap-2">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${getCorMeta(cor).bg}`}>
          {icone}
        </div>
        <input
          ref={inputRef}
          type="text" value={nome}
          onChange={e => setNome(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="Ex: Nubank, Bradesco, Carteira..."
          maxLength={30}
          className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-500 dark:bg-slate-600 dark:text-slate-100 dark:placeholder-slate-400 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
        />
      </div>

      {/* Dia de vencimento */}
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
          Dia de vencimento da fatura
        </label>
        <div className="flex items-center gap-3 bg-white dark:bg-slate-600 rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-500">
          <span className="text-sm text-slate-600 dark:text-slate-300 flex-1">Todo dia</span>
          <div className="flex items-center gap-2">
            <button type="button"
              onClick={() => setDiaVencimento(d => Math.max(1, d - 1))}
              className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-500 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-500">
              −
            </button>
            <span className="w-8 text-center text-sm font-bold text-slate-800 dark:text-slate-100">{diaVencimento}</span>
            <button type="button"
              onClick={() => setDiaVencimento(d => Math.min(31, d + 1))}
              className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-500 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-500">
              +
            </button>
          </div>
          <span className="text-sm text-slate-600 dark:text-slate-300">do mês</span>
        </div>
      </div>

      {/* Dias aviso fatura */}
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
          Aviso antes do vencimento
        </label>
        <div className="flex items-center gap-3 bg-white dark:bg-slate-600 rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-500">
          <span className="text-sm text-slate-600 dark:text-slate-300 flex-1">Avisar</span>
          <div className="flex items-center gap-2">
            <button type="button"
              onClick={() => setDiasAviso(d => Math.max(1, d - 1))}
              className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-500 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-500">
              −
            </button>
            <span className="w-8 text-center text-sm font-bold text-slate-800 dark:text-slate-100">{diasAviso}</span>
            <button type="button"
              onClick={() => setDiasAviso(d => Math.min(30, d + 1))}
              className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-500 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-500">
              +
            </button>
          </div>
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {diasAviso === 1 ? 'dia antes' : 'dias antes'}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-500 text-slate-500 dark:text-slate-400 text-sm font-medium">
          Cancelar
        </button>
        <button type="button" onClick={handleSave} disabled={!nome.trim() || saving}
          className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50">
          {saving ? 'Salvando...' : 'Criar'}
        </button>
      </div>
    </div>
  )
}

// ─── Linha de cartão expansível ───────────────────────────────────────────────
function CartaoRow({ cartao, onUpdate, onDelete }) {
  const meta = getCorMeta(cartao.cor)
  const [expanded, setExpanded] = useState(false)
  const [diaVencimento, setDiaVencimento] = useState(cartao.dia_vencimento ?? 1)
  const [diasAviso, setDiasAviso] = useState(cartao.dias_aviso_fatura ?? 3)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onUpdate(cartao.id, { dia_vencimento: diaVencimento, dias_aviso_fatura: diasAviso })
    setSaving(false)
    setExpanded(false)
  }

  const handleDelete = async () => {
    if (!window.confirm(`Excluir o cartão "${cartao.nome}"?`)) return
    setDeleting(true)
    await onDelete(cartao.id)
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Linha principal */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${meta.bg}`}>
          {cartao.icone}
        </div>
        <span className="flex-1 text-left text-sm font-semibold text-slate-700 dark:text-slate-200">{cartao.nome}</span>
        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${meta.dot}`} />
        <span className="text-slate-400 dark:text-slate-500 text-xs ml-1">
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {/* Painel expansível */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-100 dark:border-slate-700 space-y-3">

          {/* Dia de vencimento */}
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1.5">
              Dia de vencimento da fatura
            </label>
            <div className="flex items-center gap-3 bg-white dark:bg-slate-700 rounded-xl px-4 py-2.5 border border-slate-200 dark:border-slate-600">
              <span className="text-sm text-slate-600 dark:text-slate-300 flex-1">Todo dia</span>
              <div className="flex items-center gap-2">
                <button type="button"
                  onClick={() => setDiaVencimento(d => Math.max(1, d - 1))}
                  className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 text-sm">
                  −
                </button>
                <span className="w-7 text-center text-sm font-bold text-slate-800 dark:text-slate-100">{diaVencimento}</span>
                <button type="button"
                  onClick={() => setDiaVencimento(d => Math.min(31, d + 1))}
                  className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 text-sm">
                  +
                </button>
              </div>
              <span className="text-sm text-slate-600 dark:text-slate-300">do mês</span>
            </div>
          </div>

          {/* Dias de aviso */}
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1.5">
              Aviso antes do vencimento
            </label>
            <div className="flex items-center gap-3 bg-white dark:bg-slate-700 rounded-xl px-4 py-2.5 border border-slate-200 dark:border-slate-600">
              <span className="text-sm text-slate-600 dark:text-slate-300 flex-1">Avisar</span>
              <div className="flex items-center gap-2">
                <button type="button"
                  onClick={() => setDiasAviso(d => Math.max(1, d - 1))}
                  className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 text-sm">
                  −
                </button>
                <span className="w-7 text-center text-sm font-bold text-slate-800 dark:text-slate-100">{diasAviso}</span>
                <button type="button"
                  onClick={() => setDiasAviso(d => Math.min(30, d + 1))}
                  className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 text-sm">
                  +
                </button>
              </div>
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {diasAviso === 1 ? 'dia antes' : 'dias antes'}
              </span>
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={handleDelete} disabled={deleting}
              className="flex-1 py-2 rounded-xl border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors">
              {deleting ? 'Excluindo...' : 'Excluir'}
            </button>
            <button type="button" onClick={handleSave} disabled={saving}
              className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Página de perfil ─────────────────────────────────────────────────────────
export default function PerfilPage({ onBack }) {
  const { user, signOut, updateUserMeta } = useAuth()
  const { cartoes, loading: cartoesLoading, createCartao, deleteCartao, updateCartao } = useCartoes()
  const { supported: pushSupported, permission, subscribed, loading: pushLoading, subscribe, unsubscribe } = usePushNotifications()
  const gcal = useGoogleCalendar()
  const [pushError, setPushError] = useState(null)
  const [gcalError, setGcalError] = useState(null)
  const [addingCartao, setAddingCartao] = useState(false)
  const [avatar, setAvatar] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const name = user?.user_metadata?.full_name || user?.email || 'Usuário'
  const email = user?.email || ''

  // Carrega avatar
  useEffect(() => {
    if (!user) return
    const local = localStorage.getItem(`avatar_${user.id}`)
    if (local) setAvatar(local)
    const metaUrl = user?.user_metadata?.avatar_url
    if (metaUrl) {
      const ts = user?.user_metadata?.avatar_updated ?? ''
      const urlFinal = metaUrl + (metaUrl.includes('?') ? '&' : '?') + 'cb=' + ts
      setAvatar(urlFinal)
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
            const { error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true })
            if (uploadError) throw uploadError

            const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
            const publicUrl = urlData.publicUrl
            const timestamp = Date.now().toString()
            await updateUserMeta({ avatar_url: publicUrl, avatar_updated: timestamp })
            await supabase.auth.refreshSession()
            setAvatar(publicUrl + '?cb=' + timestamp)
            localStorage.setItem(`avatar_${user.id}`, publicUrl)
          } catch (err) {
            console.error('Erro ao fazer upload:', err)
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

  const handleCreateCartao = async (payload) => {
    return createCartao(payload)
  }

  return (
    <div className="min-h-screen bg-background page-enter">
      {/* Header */}
      <header className="bg-primary text-white shadow-md">
        <div className="relative px-4 pt-safe pb-5">
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={onBack}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors text-white text-lg"
              aria-label="Voltar"
            >
              ←
            </button>
            <h1 className="text-base font-bold">Meu Perfil</h1>
          </div>

          {/* Avatar + info */}
          <div className="flex flex-col items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={handleAvatarClick}
              className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-white/40 bg-white/10 active:scale-95 transition-transform"
              title="Toque para trocar sua foto"
            >
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {avatar ? (
                <img src={avatar} alt="Minha foto" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl">
                  {name[0]?.toUpperCase()}
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 bg-black/30 flex items-center justify-center py-1">
                <span className="text-white text-[10px] font-medium">Editar</span>
              </div>
            </button>
            <div className="text-center">
              <p className="text-white font-bold text-lg leading-tight">{name}</p>
              <p className="text-white/60 text-sm">{email}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <div className="px-4 py-5 space-y-6 pb-24">

        {/* Meus Cartões */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              Meus Cartões
            </h2>
          </div>

          {cartoesLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-400 dark:text-slate-500 text-sm">
              Carregando...
            </div>
          ) : (
            <div className="space-y-2">
              {cartoes.length === 0 && !addingCartao && (
                <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-sm">
                  Nenhum cartão cadastrado ainda.
                </div>
              )}

              {cartoes.map(c => (
                <CartaoRow
                  key={c.id}
                  cartao={c}
                  onUpdate={updateCartao}
                  onDelete={deleteCartao}
                />
              ))}

              {addingCartao ? (
                <NewCartaoInProfile
                  createCartao={handleCreateCartao}
                  onCreated={() => setAddingCartao(false)}
                  onCancel={() => setAddingCartao(false)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingCartao(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:border-primary hover:text-primary transition-all text-sm font-medium"
                >
                  <span className="text-lg leading-none">＋</span>
                  Adicionar cartão
                </button>
              )}
            </div>
          )}
        </section>

        {/* ── Notificações ── */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">🔔 Notificações</h2>
          </div>

          <div className="px-4 py-4 space-y-3">
            {!pushSupported ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                Notificações push não são suportadas neste navegador.
                {' '}No iPhone, instale o app via <strong>"Adicionar à Tela de Início"</strong> e abra por lá.
              </p>
            ) : permission === 'denied' ? (
              <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                ⚠️ Notificações bloqueadas. Vá em <strong>Configurações → Safari/Chrome → Notificações</strong> e permita este site.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {subscribed ? 'Notificações ativas' : 'Receber avisos neste dispositivo'}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {pushLoading
                        ? 'Aguarde...'
                        : subscribed
                          ? 'Você receberá avisos de vencimentos'
                          : 'Ative para receber avisos de contas'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setPushError(null)
                      const result = subscribed ? await unsubscribe() : await subscribe()
                      if (result?.error) setPushError(result.error)
                    }}
                    disabled={pushLoading}
                    className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50
                      ${subscribed ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-600'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
                      ${subscribed ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
                {pushError && (
                  <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">
                    ⚠️ {pushError}
                  </p>
                )}
              </>
            )}
          </div>
        </section>

        {/* ── Google Calendar ── */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round"/>
              <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round"/>
            </svg>
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Google Calendar</h2>
            {gcal.connected && (
              <span className="ml-auto text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full">
                ✓ Conectado
              </span>
            )}
          </div>

          <div className="px-4 py-4 space-y-3">
            {/* Não configurado */}
            {!gcal.configured ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Para ativar a sincronização com o Google Calendar, o app precisa ser configurado com uma chave do Google Cloud Console.
                </p>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2.5 space-y-1">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">⚙️ Configuração necessária</p>
                  <p className="text-xs text-amber-600 dark:text-amber-500 leading-relaxed">
                    Adicione <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded font-mono">VITE_GOOGLE_CLIENT_ID</code> nas variáveis de ambiente do projeto (arquivo <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded font-mono">.env</code> e no Vercel).
                  </p>
                </div>
              </div>
            ) : gcal.connected ? (
              <>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Lançamentos criados, editados ou excluídos serão automaticamente sincronizados com o seu Google Calendar.
                </p>
                <button
                  type="button"
                  onClick={() => { setGcalError(null); gcal.disconnect() }}
                  className="w-full py-2.5 rounded-xl border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Desconectar do Google Calendar
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Conecte sua conta Google para sincronizar automaticamente os lançamentos com a sua agenda.
                  Os eventos são criados, atualizados e removidos em tempo real.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    setGcalError(null)
                    const result = await gcal.connect()
                    if (result?.error) setGcalError(result.error)
                  }}
                  disabled={gcal.loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {gcal.loading ? (
                    <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg viewBox="0 0 48 48" className="w-4 h-4 flex-shrink-0">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                  )}
                  {gcal.loading ? 'Conectando...' : 'Entrar com Google'}
                </button>
                {gcalError && (
                  <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">
                    ⚠️ {gcalError}
                  </p>
                )}
              </>
            )}
          </div>
        </section>

        {/* Botão Sair */}
        <button
          type="button"
          onClick={signOut}
          className="w-full py-3.5 rounded-2xl border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 font-semibold text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          Sair da conta
        </button>
      </div>
    </div>
  )
}
