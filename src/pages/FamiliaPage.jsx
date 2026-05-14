import { useState, useEffect, useCallback, useRef } from 'react'
import { useFamilia } from '../hooks/useFamilia'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../utils/format'
import { fetchResumosFamilias } from '../utils/familiaLancamentos'
import { divisaoIgualitaria, divisaoComValor, divisaoValida, calcularSaldos, minhaFatia } from '../utils/divisao'
import { useSwipeDown } from '../utils/useSwipeDown'
import { useToast } from '../components/ui/Toast'
import SkyToggle from '../components/ui/SkyToggle'
import MonthYearPicker from '../components/ui/MonthYearPicker'

// Emojis comuns para ícones de família
const ICONES_FAMILIA = [
  '👨‍👩‍👧‍👦','👨‍👩‍👧','👨‍👩‍👦','👩‍👧','👨‍👧','👩‍👦','👨‍👦',
  '💑','👫','👭','👬','❤️','🏠','🏡','🏘️',
  '🐶','🐱','🐰','🦊','🐻','🐼','🐨',
  '🎓','🎂','🎉','⭐','🌟','✨','🌈',
  '🍕','🍔','🍰','☕','🌳','🌴','🌻',
]

const CATEGORIAS = ['Alimentação','Moradia','Transporte','Saúde','Educação','Lazer','Roupas','Serviços','Pets','Outros']
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

// ─── Avatar de inicial ────────────────────────────────────────────────────────
function Avatar({ nome, size = 'md' }) {
  const initial = (nome || '?')[0].toUpperCase()
  const colors  = ['bg-blue-400','bg-purple-400','bg-pink-400','bg-emerald-400','bg-orange-400','bg-red-400','bg-teal-400']
  const color   = colors[initial.charCodeAt(0) % colors.length]
  const sz      = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {initial}
    </div>
  )
}

// ─── Card de convite recebido ─────────────────────────────────────────────────
function ConviteCard({ convite, onAceitar, onRecusar, loading }) {
  return (
    <div className="bg-primary/5 dark:bg-primary/10 border-2 border-primary/20 rounded-3xl p-5 text-center">
      <div className="text-4xl mb-3">👨‍👩‍👧‍👦</div>
      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Convite para família</p>
      <p className="text-2xl font-extrabold text-primary mb-1">{convite.familia_nome}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
        <strong className="text-slate-600 dark:text-slate-300">{convite.convidado_por_nome}</strong> te convidou para compartilhar as finanças
      </p>
      <div className="flex gap-3">
        <button type="button" onClick={onRecusar} disabled={loading}
          className="flex-1 py-3 rounded-2xl border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 font-semibold text-sm disabled:opacity-50">
          Recusar
        </button>
        <button type="button" onClick={onAceitar} disabled={loading}
          className="flex-1 py-3 rounded-2xl bg-primary text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
          {loading
            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : '✓ Entrar na família'}
        </button>
      </div>
    </div>
  )
}

// ─── Picker de ícones (grade de emojis) ───────────────────────────────────────
function IconPicker({ selected, onSelect }) {
  return (
    <div className="grid grid-cols-7 gap-1.5 max-h-44 overflow-y-auto p-1">
      {ICONES_FAMILIA.map(emoji => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          className={`aspect-square rounded-xl flex items-center justify-center text-xl transition-all
            ${selected === emoji
              ? 'bg-primary/15 dark:bg-primary/30 ring-2 ring-primary scale-110'
              : 'bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 active:scale-95'}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}

// ─── Formulário criar família ─────────────────────────────────────────────────
function CriarFamiliaForm({ onCreate, onCancel }) {
  const [nome, setNome]     = useState('')
  const [icone, setIcone]   = useState('👨‍👩‍👧‍👦')
  const [saving, setSaving] = useState(false)
  const [erro, setErro]     = useState('')

  const handleCreate = async () => {
    if (!nome.trim()) return
    setSaving(true); setErro('')
    const result = await onCreate(nome, icone)
    setSaving(false)
    if (result?.error) setErro(result.error)
  }

  return (
    <div className="space-y-3">
      {/* Preview + nome */}
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-3xl flex-shrink-0">
          {icone}
        </div>
        <input type="text" value={nome} onChange={e => { setNome(e.target.value); setErro('') }}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="Nome (ex: Família Silva)"
          maxLength={40} autoFocus
          className={`flex-1 px-4 py-3 rounded-2xl border dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400 text-sm outline-none focus:ring-2 focus:ring-primary/10 font-medium transition-colors
            ${erro ? 'border-red-400 focus:border-red-400' : 'border-slate-200 dark:border-slate-600 focus:border-primary'}`} />
      </div>

      {erro && (
        <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">⚠️ {erro}</p>
      )}

      {/* Picker de ícone */}
      <div>
        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
          Escolha um ícone
        </p>
        <IconPicker selected={icone} onSelect={setIcone} />
      </div>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500 text-sm font-medium">
          Cancelar
        </button>
        <button type="button" onClick={handleCreate} disabled={!nome.trim() || saving}
          className="flex-1 py-3 rounded-2xl bg-primary text-white font-semibold text-sm disabled:opacity-50">
          {saving ? 'Criando...' : 'Criar família'}
        </button>
      </div>
    </div>
  )
}

// ─── Sheet de editar família (nome e ícone) ───────────────────────────────────
function EditarFamiliaSheet({ open, familia, onClose, onSave }) {
  const [nome, setNome]     = useState('')
  const [icone, setIcone]   = useState('👨‍👩‍👧‍👦')
  const [saving, setSaving] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const { sheetRef, swipeStyle, touchHandlers } = useSwipeDown(() => setMinimized(true), !minimized)

  useEffect(() => {
    if (open && familia) {
      setNome(familia.nome ?? '')
      setIcone(familia.icone ?? '👨‍👩‍👧‍👦')
      setMinimized(false)
    }
  }, [open, familia])

  if (!open) return null

  const handleSave = async () => {
    if (!nome.trim()) return
    setSaving(true)
    const r = await onSave({ nome: nome.trim(), icone })
    setSaving(false)
    if (!r?.error) onClose()
  }

  return (
    <>
      {!minimized && (
        <div className="fixed inset-0 bg-black/40 z-40 transition-opacity duration-200" onClick={onClose} />
      )}
      <div
        ref={sheetRef}
        {...touchHandlers}
        className={`fixed left-1/2 z-50 bg-white dark:bg-slate-800 shadow-2xl transition-all duration-300
        ${minimized
          ? 'rounded-3xl w-[calc(100%-2rem)] max-w-md max-h-[5.5rem] overflow-hidden'
          : 'bottom-0 rounded-t-3xl w-full max-w-xl pb-safe max-h-[90dvh] overflow-y-auto'}`}
        style={{
          ...swipeStyle,
          bottom: minimized
            ? 'calc(env(safe-area-inset-bottom) + 5.5rem)'
            : undefined
        }}>
        <button type="button" onClick={() => setMinimized(v => !v)}
          className={`w-full flex flex-col items-center active:bg-slate-50 dark:active:bg-slate-700/40
            ${minimized ? 'py-4 px-4' : 'pt-3 pb-2'}`}
          aria-label={minimized ? 'Expandir' : 'Minimizar'}>
          <div className={`bg-slate-300 dark:bg-slate-500 rounded-full
            ${minimized ? 'w-16 h-1.5 mb-2' : 'w-12 h-1.5'}`} />
          {minimized && (
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Editar família
              </p>
              <span className="text-slate-400 dark:text-slate-500 text-xs">↑ toque para expandir</span>
            </div>
          )}
        </button>
        {!minimized && (
        <div className="px-4 pb-10 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex-1">Editar família</h3>
            <button type="button" onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-lg leading-none flex-shrink-0"
              aria-label="Fechar">×</button>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-3xl flex-shrink-0">
              {icone}
            </div>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)}
              placeholder="Nome da família"
              maxLength={40}
              className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 font-medium" />
          </div>

          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              Ícone
            </p>
            <IconPicker selected={icone} onSelect={setIcone} />
          </div>

          <button type="button" onClick={handleSave} disabled={!nome.trim() || saving}
            className="w-full py-3.5 rounded-2xl bg-primary text-white font-semibold text-sm disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
          {/* Espaço extra pra bottom nav não colar */}
          <div className="h-16" />
        </div>
        )}
      </div>
    </>
  )
}

// ─── Lista inline de usuários para convidar ──────────────────────────────────
function UserPickerInline({ membroEmails, onSelect }) {
  const [busca, setBusca]     = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const timerRef              = useRef(null)

  const search = useCallback(async (q) => {
    setLoading(true)
    const query = supabase.from('profiles').select('id, nome, email')
    if (q) query.or(`nome.ilike.%${q}%,email.ilike.%${q}%`)
    const { data } = await query.order('nome').limit(50)
    setResults((data ?? []).filter(p => !membroEmails.includes(p.email)))
    setLoading(false)
  }, [membroEmails])

  useEffect(() => { search('') }, [search])
  useEffect(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(busca.trim()), 300)
    return () => clearTimeout(timerRef.current)
  }, [busca, search])

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl px-3 py-3">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-slate-400 flex-shrink-0">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
        </svg>
        <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          className="flex-1 text-sm bg-transparent outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500" />
        {busca && <button onClick={() => setBusca('')} className="text-slate-400 text-lg leading-none px-1">×</button>}
      </div>
      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : results.length === 0 ? (
        <p className="text-center text-sm text-slate-400 dark:text-slate-500 py-4">
          {busca ? 'Nenhum usuário encontrado' : 'Nenhum outro usuário cadastrado'}
        </p>
      ) : (
        <div className="overflow-y-auto rounded-2xl border border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700"
          style={{ maxHeight: '116px' }}>
          {results.map(u => (
            <button key={u.id} type="button" onClick={() => onSelect(u)}
              className="w-full flex items-center gap-3 bg-white dark:bg-slate-800 px-3 py-3 text-left active:bg-primary/10 dark:active:bg-primary/20">
              <Avatar nome={u.nome} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{u.nome}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{u.email}</p>
              </div>
              <span className="text-xs text-primary font-semibold flex-shrink-0">Convidar</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Modal de adicionar/editar lançamento ─────────────────────────────────────
function NovoLancamentoSheet({ open, onClose, onSave, editingItem }) {
  const [tipo, setTipo]     = useState('Saída')
  const [data, setData]     = useState(new Date().toISOString().split('T')[0])
  const [desc, setDesc]     = useState('')
  const [cat, setCat]       = useState('Outros')
  const [valor, setValor]   = useState('')
  const [saving, setSaving] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const { sheetRef, swipeStyle, touchHandlers } = useSwipeDown(() => setMinimized(true), !minimized)

  useEffect(() => {
    if (open) {
      if (editingItem) {
        setTipo(editingItem.tipo)
        setData(editingItem.data_vencimento)
        setDesc(editingItem.descricao)
        setCat(editingItem.categoria || 'Outros')
        setValor(String(Number(editingItem.valor ?? 0).toFixed(2)).replace('.', ','))
      } else {
        setTipo('Saída'); setDesc(''); setValor('')
        setData(new Date().toISOString().split('T')[0]); setCat('Outros')
      }
      setMinimized(false)
    }
  }, [open, editingItem])

  if (!open) return null
  const isEdit = !!editingItem

  const handleSave = async () => {
    const num = parseFloat(valor.replace(',', '.'))
    if (!desc.trim() || isNaN(num) || num <= 0) return
    setSaving(true)
    const result = await onSave({ tipo, data_vencimento: data, descricao: desc.trim(), categoria: cat, valor: num })
    setSaving(false)
    if (result?.error) return  // mantém modal aberto se falhou
    onClose()
  }

  return (
    <>
      {!minimized && (
        <div className="fixed inset-0 bg-black/40 z-40 transition-opacity duration-200" onClick={onClose} />
      )}
      <div
        ref={sheetRef}
        {...touchHandlers}
        className={`fixed left-1/2 z-50 bg-white dark:bg-slate-800 shadow-2xl transition-all duration-300
        ${minimized
          ? 'rounded-3xl w-[calc(100%-2rem)] max-w-md max-h-[5.5rem] overflow-hidden'
          : 'bottom-0 rounded-t-3xl w-full max-w-xl pb-safe max-h-[90dvh] overflow-y-auto'}`}
        style={{
          ...swipeStyle,
          bottom: minimized
            ? 'calc(env(safe-area-inset-bottom) + 5.5rem)'
            : undefined
        }}>
        <button type="button" onClick={() => setMinimized(v => !v)}
          className={`w-full flex flex-col items-center active:bg-slate-50 dark:active:bg-slate-700/40
            ${minimized ? 'py-4 px-4' : 'pt-3 pb-2'}`}
          aria-label={minimized ? 'Expandir' : 'Minimizar'}>
          <div className={`bg-slate-300 dark:bg-slate-500 rounded-full
            ${minimized ? 'w-16 h-1.5 mb-2' : 'w-12 h-1.5'}`} />
          {minimized && (
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Nova conta
              </p>
              <span className="text-slate-400 dark:text-slate-500 text-xs">↑ toque para expandir</span>
            </div>
          )}
        </button>
        {!minimized && (
        <div className="px-4 pb-10 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex-1">
              {isEdit ? 'Editar conta da família' : 'Nova conta da família'}
            </h3>
            <button type="button" onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-lg leading-none flex-shrink-0"
              aria-label="Fechar">×</button>
          </div>
          <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600">
            {['Saída','Entrada'].map(t => (
              <button key={t} type="button" onClick={() => setTipo(t)}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors
                  ${tipo === t ? (t === 'Saída' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white') : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                {t === 'Saída' ? '🔴 Saída' : '💚 Entrada'}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Data de vencimento</label>
            <input type="date" value={data} onChange={e => setData(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Descrição</label>
            <input type="text" value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="Ex: Conta de luz, Supermercado..."
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Categoria</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIAS.map(c => (
                <button key={c} type="button" onClick={() => setCat(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                    ${cat === c ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Valor</label>
            <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl px-3 py-2.5">
              <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">R$</span>
              <input type="text" inputMode="decimal" value={valor} onChange={e => setValor(e.target.value.replace(/[^\d,]/g,''))}
                placeholder="0,00"
                className="flex-1 text-sm bg-transparent outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400" />
            </div>
          </div>
          <button type="button" onClick={handleSave} disabled={!desc.trim() || !valor || saving}
            className="w-full py-3.5 rounded-2xl bg-primary text-white font-semibold text-sm disabled:opacity-50">
            {saving ? 'Salvando...' : (isEdit ? 'Salvar alterações' : 'Adicionar')}
          </button>
          {/* Espaço extra pra bottom nav não colar */}
          <div className="h-16" />
        </div>
        )}
      </div>
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TELA 1 — Lista de famílias
// ══════════════════════════════════════════════════════════════════════════════
function FamiliaListScreen({
  familias, convitesPendentes, loading,
  onEntrar, onCriar, onEditar, onAceitar, onRecusar, isDark, toggleTheme,
}) {
  const { user } = useAuth()
  const [showCriar, setShowCriar]     = useState(false)
  const [actionLoading, setActionLoad] = useState(null) // id do convite em loading
  const [resumos, setResumos]          = useState({}) // { familiaId: { receber, pagar } }
  const [familiaEditando, setFamiliaEditando] = useState(null)

  // Carrega resumos do mês atual para todas as famílias (só a fatia do usuário)
  useEffect(() => {
    if (!familias?.length || !user?.id) { setResumos({}); return }
    const now = new Date()
    const familyIds = familias.map(f => f.id)
    fetchResumosFamilias(familyIds, now.getFullYear(), now.getMonth() + 1, user.id)
      .then(setResumos)
      .catch(() => setResumos({}))
  }, [familias, user?.id])

  const roleLabel = (role) => role === 'admin' ? 'Admin' : 'Membro'
  const roleColor = (role) => role === 'admin'
    ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-300'
    : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'

  return (
    <div className="min-h-screen bg-background flex flex-col page-enter">

      {/* Header */}
      <div className="bg-primary text-white px-4 pt-safe pb-5 shadow-md flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/60 text-xs font-medium uppercase tracking-wide leading-none mb-0.5">Compartilhado</p>
            <h1 className="text-xl font-extrabold leading-tight">👨‍👩‍👧‍👦 Famílias</h1>
          </div>
          <SkyToggle checked={isDark} onChange={toggleTheme} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-36 px-4 pt-5 space-y-4">

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Convites recebidos */}
            {convitesPendentes.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Convites recebidos
                </p>
                {convitesPendentes.map(c => (
                  <ConviteCard key={c.id} convite={c}
                    loading={actionLoading === c.id}
                    onAceitar={async () => {
                      setActionLoad(c.id)
                      await onAceitar(c)
                      setActionLoad(null)
                    }}
                    onRecusar={() => onRecusar(c)}
                  />
                ))}
              </div>
            )}

            {/* Minhas famílias */}
            {familias.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Minhas famílias
                </p>
                {familias.map(f => {
                  const r = resumos[f.id] ?? { receber: 0, pagar: 0 }
                  const temResumo = r.receber > 0 || r.pagar > 0
                  const isAdmin = f.meu_role === 'admin'
                  return (
                    <div key={f.id}
                      className="w-full bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 px-5 py-4 shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-center gap-4">
                        {/* Ícone + Info + Seta — área principal clicável */}
                        <button type="button" onClick={() => onEntrar(f.id)}
                          className="flex items-center gap-4 flex-1 min-w-0 text-left active:scale-[.98] transition-transform">
                          <div className="w-14 h-14 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-3xl flex-shrink-0">
                            {f.icone || '👨‍👩‍👧‍👦'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">{f.nome}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleColor(f.meu_role)}`}>
                                {roleLabel(f.meu_role)}
                              </span>
                            </div>
                          </div>
                        </button>
                        {/* Botão editar (admin) */}
                        {isAdmin && (
                          <button type="button"
                            onClick={() => setFamiliaEditando(f)}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
                            aria-label="Editar família">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        )}
                        {/* Seta abre detalhe */}
                        <button type="button" onClick={() => onEntrar(f.id)}
                          className="text-slate-300 dark:text-slate-600 text-xl flex-shrink-0"
                          aria-label="Abrir família">›</button>
                      </div>

                      {/* Resumo financeiro do mês (net da sua fatia) */}
                      {temResumo && (() => {
                        const net = r.receber - r.pagar
                        const isReceiver = net > 0.01
                        const isPayer    = net < -0.01
                        return (
                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                            <div className={`rounded-xl px-4 py-2.5 text-center
                              ${isReceiver
                                ? 'bg-emerald-50 dark:bg-emerald-900/20'
                                : isPayer
                                  ? 'bg-amber-50 dark:bg-amber-900/20'
                                  : 'bg-slate-50 dark:bg-slate-700/40'}`}>
                              <p className={`text-[10px] font-bold uppercase tracking-wide
                                ${isReceiver ? 'text-emerald-600 dark:text-emerald-400'
                                  : isPayer ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-slate-400 dark:text-slate-500'}`}>
                                {isReceiver ? 'A receber' : isPayer ? 'A pagar' : 'Quitado'}
                              </p>
                              <p className={`text-base font-extrabold mt-0.5
                                ${isReceiver ? 'text-emerald-700 dark:text-emerald-400'
                                  : isPayer ? 'text-amber-700 dark:text-amber-400'
                                  : 'text-slate-500 dark:text-slate-400'}`}>
                                {formatCurrency(Math.abs(net))}
                              </p>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Sem famílias e sem convites */}
            {familias.length === 0 && convitesPendentes.length === 0 && !showCriar && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
                <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">Nenhuma família ainda</h2>
                <p className="text-sm text-slate-400 dark:text-slate-500 leading-relaxed">
                  Crie uma família para compartilhar finanças com quem você ama.
                </p>
              </div>
            )}

            {/* Formulário criar */}
            {showCriar && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-5">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Nova família</p>
                <CriarFamiliaForm
                  onCreate={async (nome) => {
                    const r = await onCriar(nome)
                    if (!r?.error) setShowCriar(false)
                    return r
                  }}
                  onCancel={() => setShowCriar(false)}
                />
              </div>
            )}

            {/* Botão criar nova */}
            {!showCriar && (
              <button type="button" onClick={() => setShowCriar(true)}
                className="w-full flex items-center gap-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl px-5 py-4 text-left hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-2xl flex-shrink-0">
                  ＋
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Criar nova família</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Convide membros após criar</p>
                </div>
              </button>
            )}
          </>
        )}
      </div>

      {/* Sheet de editar família (acessível direto da lista, sem precisar entrar) */}
      <EditarFamiliaSheet
        open={!!familiaEditando}
        familia={familiaEditando}
        onClose={() => setFamiliaEditando(null)}
        onSave={async (updates) => {
          if (!familiaEditando) return { error: 'sem família' }
          return await onEditar(familiaEditando.id, updates)
        }}
      />
    </div>
  )
}

// ─── Helper: auto-balanceia divisão quando muda uma linha ─────────────────────
function autoBalanceDivisao(linhas, idxMudado, novoValor) {
  const v = Math.max(0, Math.min(100, Number(novoValor) || 0))
  const atualizado = [...linhas]
  atualizado[idxMudado] = { ...atualizado[idxMudado], percentual: v }
  const restante = +(100 - v).toFixed(2)
  const outros = atualizado.filter((_, i) => i !== idxMudado)

  if (outros.length === 0) return atualizado
  if (outros.length === 1) {
    // Apenas 1 outro membro — leva tudo o restante
    atualizado.forEach((l, i) => {
      if (i !== idxMudado) atualizado[i] = { ...l, percentual: Math.max(0, restante) }
    })
    return atualizado
  }

  // 2+ outros membros — distribui proporcionalmente ao que já têm
  const somaOutros = outros.reduce((s, l) => s + l.percentual, 0)
  if (somaOutros > 0) {
    let acumulado = 0
    let ultimoIdx = -1
    atualizado.forEach((l, i) => {
      if (i === idxMudado) return
      ultimoIdx = i
      const proporcao = l.percentual / somaOutros
      const novo = +(Math.max(0, restante) * proporcao).toFixed(2)
      atualizado[i] = { ...l, percentual: novo }
      acumulado += novo
    })
    // Ajusta o último para fechar 100 exato
    if (ultimoIdx >= 0) {
      const ajuste = +(Math.max(0, restante) - (acumulado - atualizado[ultimoIdx].percentual)).toFixed(2)
      atualizado[ultimoIdx] = { ...atualizado[ultimoIdx], percentual: Math.max(0, ajuste) }
    }
    return atualizado
  }

  // Se outros estão zerados, divide o restante igualmente
  const cada = +(Math.max(0, restante) / outros.length).toFixed(2)
  let acum = 0
  let ultIdx = -1
  atualizado.forEach((l, i) => {
    if (i === idxMudado) return
    ultIdx = i
    atualizado[i] = { ...l, percentual: cada }
    acum += cada
  })
  if (ultIdx >= 0) {
    atualizado[ultIdx] = { ...atualizado[ultIdx], percentual: +(Math.max(0, restante) - (acum - cada)).toFixed(2) }
  }
  return atualizado
}

// ─── Sheet: editor de divisão de um lançamento ────────────────────────────────
function DivisaoEditorSheet({ open, lancamento, membros, onClose, onSave }) {
  const [modo, setModo]     = useState('percentual') // 'percentual' | 'valor'
  const [linhas, setLinhas] = useState([])
  const [saving, setSaving] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const { sheetRef, swipeStyle, touchHandlers } = useSwipeDown(() => setMinimized(true), !minimized)

  useEffect(() => {
    if (!open || !lancamento) return
    const inicial = (lancamento.divisao?.length ? lancamento.divisao : divisaoIgualitaria(membros))
    setLinhas(inicial.map(d => ({
      user_id: d.user_id,
      nome:    d.nome,
      percentual: Number(d.percentual ?? 0),
    })))
    setModo('percentual')
    setMinimized(false)
  }, [open, lancamento, membros])

  if (!open || !lancamento) return null

  const valorTotal = Number(lancamento.valor ?? 0)

  const updatePercentual = (idx, novo) => {
    setLinhas(prev => autoBalanceDivisao(prev, idx, novo))
  }

  const updateValor = (idx, novo) => {
    if (valorTotal <= 0) return
    const v = Math.max(0, Math.min(valorTotal, Number(novo) || 0))
    const pct = +(v / valorTotal * 100).toFixed(2)
    setLinhas(prev => autoBalanceDivisao(prev, idx, pct))
  }

  const dividirIgualmente = () => {
    setLinhas(divisaoIgualitaria(membros).map(d => ({
      user_id: d.user_id, nome: d.nome, percentual: d.percentual,
    })))
  }

  const somaPct = linhas.reduce((s, l) => s + l.percentual, 0)
  const podeSubmeter = Math.abs(somaPct - 100) < 0.05

  const handleSave = async () => {
    if (!podeSubmeter) return
    setSaving(true)
    const r = await onSave(linhas)
    setSaving(false)
    if (!r?.error) onClose()
  }

  return (
    <>
      {/* Overlay — some quando minimizado pra deixar interagir com fundo */}
      {!minimized && (
        <div className="fixed inset-0 bg-black/40 z-40 transition-opacity duration-200" onClick={onClose} />
      )}

      <div
        ref={sheetRef}
        {...touchHandlers}
        className={`fixed left-1/2 z-50 bg-white dark:bg-slate-800 shadow-2xl transition-all duration-300
        ${minimized
          ? 'rounded-3xl w-[calc(100%-2rem)] max-w-md max-h-[5.5rem] overflow-hidden'
          : 'bottom-0 rounded-t-3xl w-full max-w-xl pb-safe max-h-[90dvh] overflow-y-auto'}`}
        style={{
          ...swipeStyle,
          bottom: minimized
            ? 'calc(env(safe-area-inset-bottom) + 5.5rem)'
            : swipeStyle.bottom
        }}>

        {/* Handle de minimizar/expandir (clicável) */}
        <button type="button" onClick={() => setMinimized(v => !v)}
          className={`w-full flex flex-col items-center active:bg-slate-50 dark:active:bg-slate-700/40
            ${minimized ? 'py-4 px-4' : 'pt-3 pb-2'}`}
          aria-label={minimized ? 'Expandir' : 'Minimizar'}>
          <div className={`bg-slate-300 dark:bg-slate-500 rounded-full
            ${minimized ? 'w-16 h-1.5 mb-2' : 'w-12 h-1.5'}`} />
          {minimized && (
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Dividir conta
              </p>
              <span className="text-slate-400 dark:text-slate-500 text-xs">↑ toque para expandir</span>
            </div>
          )}
        </button>

        {!minimized && (
          <div className="px-4 pb-10 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Dividir entre membros</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                  Total: <strong className="text-slate-700 dark:text-slate-300">{formatCurrency(valorTotal)}</strong>
                </p>
              </div>
              <button type="button" onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-lg leading-none flex-shrink-0"
                aria-label="Fechar">×</button>
            </div>

            {/* Toggle modo */}
            <div className="flex rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-600">
              {[
                { id: 'percentual', label: '% Porcentagem' },
                { id: 'valor',      label: 'R$ Valor' },
              ].map(opt => (
                <button key={opt.id} type="button" onClick={() => setModo(opt.id)}
                  className={`flex-1 py-2.5 text-xs font-semibold transition-colors
                    ${modo === opt.id
                      ? 'bg-primary text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Lista de membros — cada um com slider + input */}
            <div className="space-y-3">
              {linhas.map((l, idx) => {
                const valor = +(valorTotal * l.percentual / 100).toFixed(2)
                return (
                  <div key={l.user_id} className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl px-3 py-3 space-y-2.5">
                    {/* Linha de cima: avatar + nome + input numérico */}
                    <div className="flex items-center gap-3">
                      <Avatar nome={l.nome} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{l.nome}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          {modo === 'percentual'
                            ? `${formatCurrency(valor)} · ${l.percentual.toFixed(0)}%`
                            : `${l.percentual.toFixed(0)}% do total`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={modo === 'percentual' ? 100 : valorTotal}
                          step={modo === 'percentual' ? 1 : 0.01}
                          value={modo === 'percentual' ? Math.round(l.percentual) : valor}
                          onChange={e => modo === 'percentual'
                            ? updatePercentual(idx, e.target.value)
                            : updateValor(idx, e.target.value)
                          }
                          className="w-20 text-right text-sm font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 outline-none focus:border-primary text-slate-800 dark:text-slate-100"
                        />
                        <span className="text-xs text-slate-400 dark:text-slate-500 w-3">
                          {modo === 'percentual' ? '%' : ''}
                        </span>
                      </div>
                    </div>

                    {/* Slider de porcentagem */}
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={l.percentual}
                      onChange={e => updatePercentual(idx, e.target.value)}
                      className="w-full accent-primary cursor-pointer"
                      aria-label={`Porcentagem de ${l.nome}`}
                    />
                  </div>
                )
              })}
            </div>

            {/* Status soma */}
            <div className={`text-center text-xs font-medium px-3 py-2 rounded-xl
              ${podeSubmeter
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'}`}>
              Soma: {somaPct.toFixed(2)}% {podeSubmeter ? '✓' : '— precisa ser 100%'}
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={dividirIgualmente}
                className="px-3 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 text-xs font-semibold">
                ↺ Igualmente
              </button>
              <button type="button" onClick={onClose}
                className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500 text-sm font-medium">
                Cancelar
              </button>
              <button type="button" onClick={handleSave} disabled={!podeSubmeter || saving}
                className="flex-1 py-3 rounded-2xl bg-primary text-white font-semibold text-sm disabled:opacity-50">
                {saving ? 'Salvando...' : 'Aplicar'}
              </button>
            </div>

            {/* Espaço extra para a bottom nav não colar */}
            <div className="h-16" />
          </div>
        )}
      </div>
    </>
  )
}

// ─── Sheet: selecionar quem pagou ─────────────────────────────────────────────
function PagadorSheet({ open, lancamento, membros, onClose, onConfirm }) {
  const [selected, setSelected] = useState(null)
  const [saving, setSaving]     = useState(false)
  const [minimized, setMinimized] = useState(false)
  const { sheetRef, swipeStyle, touchHandlers } = useSwipeDown(() => setMinimized(true), !minimized)

  useEffect(() => {
    if (open) {
      setSelected(lancamento?.pago_por_user_id ?? null)
      setMinimized(false)
    }
  }, [open, lancamento])

  if (!open) return null

  const handleConfirm = async () => {
    if (!selected) return
    setSaving(true)
    const m = membros.find(x => x.user_id === selected)
    const r = await onConfirm(selected, m?.nome ?? null)
    setSaving(false)
    if (!r?.error) onClose()
  }

  return (
    <>
      {!minimized && (
        <div className="fixed inset-0 bg-black/40 z-40 transition-opacity duration-200" onClick={onClose} />
      )}
      <div
        ref={sheetRef}
        {...touchHandlers}
        className={`fixed left-1/2 z-50 bg-white dark:bg-slate-800 shadow-2xl transition-all duration-300
        ${minimized
          ? 'rounded-3xl w-[calc(100%-2rem)] max-w-md max-h-[5.5rem] overflow-hidden'
          : 'bottom-0 rounded-t-3xl w-full max-w-xl pb-safe max-h-[90dvh] overflow-y-auto'}`}
        style={{
          ...swipeStyle,
          bottom: minimized
            ? 'calc(env(safe-area-inset-bottom) + 5.5rem)'
            : undefined
        }}>
        <button type="button" onClick={() => setMinimized(v => !v)}
          className={`w-full flex flex-col items-center active:bg-slate-50 dark:active:bg-slate-700/40
            ${minimized ? 'py-4 px-4' : 'pt-3 pb-2'}`}
          aria-label={minimized ? 'Expandir' : 'Minimizar'}>
          <div className={`bg-slate-300 dark:bg-slate-500 rounded-full
            ${minimized ? 'w-16 h-1.5 mb-2' : 'w-12 h-1.5'}`} />
          {minimized && (
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Quem pagou
              </p>
              <span className="text-slate-400 dark:text-slate-500 text-xs">↑ toque para expandir</span>
            </div>
          )}
        </button>
        {!minimized && (
        <div className="px-4 pb-10 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Quem pagou?</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                {lancamento?.descricao} · {formatCurrency(Number(lancamento?.valor ?? 0))}
              </p>
            </div>
            <button type="button" onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-lg leading-none flex-shrink-0"
              aria-label="Fechar">×</button>
          </div>

          <div className="space-y-1.5">
            {membros.map(m => (
              <button key={m.user_id} type="button"
                onClick={() => setSelected(m.user_id)}
                className={`w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors
                  ${selected === m.user_id
                    ? 'bg-primary/10 dark:bg-primary/20 border-2 border-primary'
                    : 'bg-slate-50 dark:bg-slate-700/50 border-2 border-transparent'}`}>
                <Avatar nome={m.nome} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{m.nome}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{m.email}</p>
                </div>
                {selected === m.user_id && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500 text-sm font-medium">
              Cancelar
            </button>
            <button type="button" onClick={handleConfirm} disabled={!selected || saving}
              className="flex-1 py-3 rounded-2xl bg-primary text-white font-semibold text-sm disabled:opacity-50">
              {saving ? 'Salvando...' : '✓ Confirmar pagamento'}
            </button>
          </div>
          {/* Espaço extra pra bottom nav não colar */}
          <div className="h-16" />
        </div>
        )}
      </div>
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TELA 2 — Detalhe da família selecionada
// ══════════════════════════════════════════════════════════════════════════════
function FamiliaDetailScreen({
  familia, membros, convitesEnviados,
  isDark, toggleTheme, onVoltar,
  convidarMembro, cancelarConviteEnviado,
  removerMembro, sairDaFamilia, updateFamilia,
  addLancamento, deleteLancamento, togglePago,
  addToast,
}) {
  const { user } = useAuth()
  const now = new Date()
  const [year, setYear]       = useState(now.getFullYear())
  const [month, setMonth]     = useState(now.getMonth() + 1)
  // Estado local de lançamentos — fetch direto com familia.id, sem depender do hook
  const [lancamentos, setLancamentos] = useState([])
  const [showAdd, setShowAdd]           = useState(false)
  const [showConvite, setShowConvite]   = useState(false)
  const [showEditar, setShowEditar]     = useState(false)
  const [usuarioSelecionado, setUsuario] = useState(null)
  const [convidando, setConvidando]     = useState(false)
  const [showMembros, setShowMembros]   = useState(false)
  const [divisaoTarget, setDivisaoTarget] = useState(null) // lançamento sendo dividido
  const [pagadorTarget, setPagadorTarget] = useState(null) // lançamento para confirmar pagador
  const [editingLancamento, setEditingLancamento] = useState(null) // lançamento sendo editado
  const [showSaldos, setShowSaldos]     = useState(false)

  // Fetch direto — usa familia.id da prop, nunca depende de familiaAtualId
  const fetchData = useCallback(async () => {
    if (!familia?.id) return
    const pad  = n => String(n).padStart(2, '0')
    const last = new Date(year, month, 0).getDate()
    const { data } = await supabase
      .from('lancamentos_familia')
      .select('*')
      .eq('familia_id', familia.id)
      .gte('data_vencimento', `${year}-${pad(month)}-01`)
      .lte('data_vencimento', `${year}-${pad(month)}-${pad(last)}`)
      .order('data_vencimento', { ascending: true })
    setLancamentos(data ?? [])
  }, [familia?.id, year, month])

  useEffect(() => { fetchData() }, [fetchData])

  const prevMonth = () => { if (month === 1) { setYear(y => y-1); setMonth(12) } else setMonth(m => m-1) }
  const nextMonth = () => { if (month === 12) { setYear(y => y+1); setMonth(1) } else setMonth(m => m+1) }

  // Wrapper: insere OU atualiza dependendo se está editando
  const handleSaveLancamento = useCallback(async (payload) => {
    if (!familia?.id) { addToast('Família não encontrada.', 'error'); return { error: 'sem família' } }

    if (editingLancamento) {
      // EDIT — atualiza os campos mas preserva divisão, pago_por, etc.
      const { data, error } = await supabase
        .from('lancamentos_familia')
        .update(payload)
        .eq('id', editingLancamento.id)
        .select()
        .single()
      if (error) { addToast(error.message, 'error'); return { error: error.message } }
      setLancamentos(prev => prev.map(l =>
        l.id === editingLancamento.id ? { ...l, ...data } : l
      ).sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento)))
      setEditingLancamento(null)
      addToast('Lançamento atualizado!', 'success')
      return { error: null }
    }

    // INSERT — divisão igualitária default
    const divisao = divisaoIgualitaria(membros)
    const { data, error } = await supabase
      .from('lancamentos_familia')
      .insert({
        ...payload,
        familia_id:      familia.id,
        criado_por:      user.id,
        criado_por_nome: user.user_metadata?.full_name || user.email.split('@')[0],
        divisao,
      })
      .select()
      .single()
    if (error) { addToast(error.message, 'error'); return { error: error.message } }
    setLancamentos(prev =>
      [...prev, data].sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))
    )
    return { error: null }
  }, [familia?.id, user, membros, editingLancamento, addToast])

  // Salva nova divisão de um lançamento
  const handleSaveDivisao = useCallback(async (novaDivisao) => {
    if (!divisaoTarget) return { error: 'sem alvo' }
    const { error } = await supabase
      .from('lancamentos_familia')
      .update({ divisao: novaDivisao })
      .eq('id', divisaoTarget.id)
    if (error) { addToast(error.message, 'error'); return { error: error.message } }
    setLancamentos(prev => prev.map(l =>
      l.id === divisaoTarget.id ? { ...l, divisao: novaDivisao } : l
    ))
    addToast('Divisão atualizada!', 'success')
    return { error: null }
  }, [divisaoTarget, addToast])

  // Confirma pagamento + quem pagou
  const handleConfirmPagador = useCallback(async (pagadorId, pagadorNome) => {
    if (!pagadorTarget) return { error: 'sem alvo' }
    const { error } = await supabase
      .from('lancamentos_familia')
      .update({
        pago:              true,
        pago_por_user_id:  pagadorId,
        pago_por_nome:     pagadorNome,
      })
      .eq('id', pagadorTarget.id)
    if (error) { addToast(error.message, 'error'); return { error: error.message } }
    setLancamentos(prev => prev.map(l =>
      l.id === pagadorTarget.id
        ? { ...l, pago: true, pago_por_user_id: pagadorId, pago_por_nome: pagadorNome }
        : l
    ))
    return { error: null }
  }, [pagadorTarget, addToast])

  const handleConvite = async () => {
    if (!usuarioSelecionado) return
    setConvidando(true)
    const result = await convidarMembro(usuarioSelecionado.email)
    setConvidando(false)
    if (result?.error) { addToast(result.error, 'error'); return }
    addToast(`Convite enviado para ${usuarioSelecionado.nome}!`, 'success')
    setUsuario(null); setShowConvite(false)
  }

  const handleDelete = useCallback(async (id) => {
    const { error } = await supabase.from('lancamentos_familia').delete().eq('id', id)
    if (error) { addToast(error.message, 'error'); return }
    setLancamentos(prev => prev.filter(l => l.id !== id))
  }, [addToast])

  const handleToggle = useCallback(async (item, pago) => {
    // Ao marcar como PAGO: abre o picker para escolher quem pagou
    if (pago) {
      setPagadorTarget(item)
      return
    }
    // Ao DESMARCAR: limpa pagador também
    const { error } = await supabase
      .from('lancamentos_familia')
      .update({ pago: false, pago_por_nome: null, pago_por_user_id: null })
      .eq('id', item.id)
    if (error) { addToast(error.message, 'error'); return }
    setLancamentos(prev => prev.map(l =>
      l.id === item.id
        ? { ...l, pago: false, pago_por_nome: null, pago_por_user_id: null }
        : l
    ))
  }, [addToast])

  const handleSair = async () => {
    if (!window.confirm('Sair da família? Seus lançamentos compartilhados permanecem.')) return
    const result = await sairDaFamilia()
    if (result?.error) { addToast(result.error, 'error'); return }
    addToast('Você saiu da família.', 'info')
    onVoltar()
  }

  // Totais da família (valores cheios — contexto geral)
  const totalEntradas = lancamentos.filter(l => l.tipo === 'Entrada').reduce((s,l) => s + Number(l.valor), 0)
  const totalSaidas   = lancamentos.filter(l => l.tipo === 'Saída').reduce((s,l) => s + Number(l.valor), 0)

  // Minha fatia das pendências (Splitwise — do MEU ponto de vista)
  const minhaFatiaSaidasPendentes = lancamentos
    .filter(l => l.tipo === 'Saída' && !l.pago)
    .reduce((s, l) => s + minhaFatia(l, user.id).valor, 0)
  const minhaFatiaEntradasPendentes = lancamentos
    .filter(l => l.tipo === 'Entrada' && !l.pago)
    .reduce((s, l) => s + minhaFatia(l, user.id).valor, 0)

  // Saldos entre membros (Splitwise — contas já pagas, ajuste entre membros)
  const saldos = calcularSaldos(lancamentos, user.id)
  const saldosArray = Object.entries(saldos)
    .filter(([_, s]) => Math.abs(s.valor) > 0.01)
    .map(([uid, s]) => ({ user_id: uid, ...s }))
  const totalMeDevem  = saldosArray.filter(s => s.valor > 0).reduce((sum, s) => sum + s.valor, 0)
  const totalEuDevo   = saldosArray.filter(s => s.valor < 0).reduce((sum, s) => sum + Math.abs(s.valor), 0)

  // NET do usuário: positivo = vai receber, negativo = vai pagar
  // = (minhas entradas pendentes + me devem) - (minhas saídas pendentes + devo)
  const meuNet = (minhaFatiaEntradasPendentes + totalMeDevem) - (minhaFatiaSaidasPendentes + totalEuDevo)

  return (
    <div className="min-h-screen bg-background flex flex-col page-enter">

      {/* Header */}
      <div className="bg-primary text-white px-4 pt-safe pb-4 shadow-md flex-shrink-0">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Botão voltar */}
            <button onClick={onVoltar}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 transition-colors text-xl font-bold flex-shrink-0">
              ‹
            </button>
            {/* Ícone da família */}
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center text-2xl flex-shrink-0">
              {familia.icone || '👨‍👩‍👧‍👦'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white/60 text-[10px] font-medium uppercase tracking-wide leading-none mb-0.5">Família</p>
              <h1 className="text-base font-extrabold leading-tight truncate">{familia.nome}</h1>
            </div>
            {familia.meu_role === 'admin' && (
              <button onClick={() => setShowEditar(true)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
                aria-label="Editar família">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <SkyToggle checked={isDark} onChange={toggleTheme} />
          </div>
        </div>

        {/* Botão convidar */}
        {familia.meu_role === 'admin' && (
          <div className="flex justify-end mb-3">
            <button onClick={() => { setShowConvite(v => !v); setUsuario(null) }}
              className="text-xs bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg font-medium transition-colors">
              + Convidar membro
            </button>
          </div>
        )}

        {/* Navegação de mês */}
        <div className="flex items-center justify-between bg-white/10 rounded-2xl px-2 py-2">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors text-lg">‹</button>
          <MonthYearPicker year={year} month={month} onChange={(y,m) => { setYear(y); setMonth(m) }} variant="dark" />
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors text-lg">›</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-36">

        {/* Painel de convite */}
        {showConvite && (
          <div className="mx-4 mt-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Convidar membro</p>
              <button onClick={() => { setShowConvite(false); setUsuario(null) }}
                className="text-slate-400 text-lg leading-none px-1">×</button>
            </div>
            {usuarioSelecionado ? (
              <>
                <div className="flex items-center gap-3 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl px-3 py-3">
                  <Avatar nome={usuarioSelecionado.nome} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{usuarioSelecionado.nome}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{usuarioSelecionado.email}</p>
                  </div>
                  <button onClick={() => setUsuario(null)} className="text-slate-400 hover:text-red-400 text-lg leading-none px-1">×</button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setUsuario(null)}
                    className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 text-slate-400 text-sm font-medium">
                    Voltar
                  </button>
                  <button onClick={handleConvite} disabled={convidando}
                    className="flex-1 py-3 bg-primary text-white rounded-2xl text-sm font-semibold disabled:opacity-50">
                    {convidando ? 'Enviando...' : '✓ Confirmar convite'}
                  </button>
                </div>
              </>
            ) : (
              <UserPickerInline
                membroEmails={[...(membros.map(m => m.email)), user?.email].filter(Boolean)}
                onSelect={u => setUsuario(u)}
              />
            )}
          </div>
        )}

        {/* Convites enviados aguardando resposta */}
        {familia.meu_role === 'admin' && convitesEnviados.length > 0 && (
          <div className="mx-4 mt-4 bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-amber-900/40 overflow-hidden">
            <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/40 flex items-center gap-2">
              <span className="text-base">⏳</span>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex-1">Convites pendentes</p>
              <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full">
                {convitesEnviados.length}
              </span>
            </div>
            {convitesEnviados.map(c => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 dark:border-slate-700 last:border-0">
                <Avatar nome={c.email} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{c.email}</p>
                  <p className="text-xs text-amber-500 dark:text-amber-400">Aguardando resposta</p>
                </div>
                <button
                  onClick={async () => {
                    const r = await cancelarConviteEnviado(c.id)
                    if (r?.error) addToast(r.error, 'error')
                    else addToast('Convite cancelado.', 'info')
                  }}
                  className="text-xs text-red-400 hover:text-red-500 font-medium px-2 py-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0">
                  Cancelar
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Membros */}
        <div className="mx-4 mt-4">
          <button onClick={() => setShowMembros(v => !v)}
            className="w-full flex items-center justify-between bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {membros.slice(0,4).map(m => <Avatar key={m.id} nome={m.nome} size="sm" />)}
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {membros.length} {membros.length === 1 ? 'membro' : 'membros'}
              </span>
            </div>
            <span className="text-slate-400 text-xs">{showMembros ? '▲' : '▼'}</span>
          </button>
          {showMembros && (
            <div className="mt-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
              {membros.map(m => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 dark:border-slate-700 last:border-0">
                  <Avatar nome={m.nome} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{m.nome}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{m.email}</p>
                  </div>
                  {m.role === 'admin' && (
                    <span className="text-[10px] bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">admin</span>
                  )}
                  {familia.meu_role === 'admin' && m.user_id !== familia.criado_por && (
                    <button onClick={() => removerMembro(m.user_id)}
                      className="text-xs text-red-400 hover:text-red-500 ml-1">✕</button>
                  )}
                </div>
              ))}
              <button onClick={handleSair}
                className="w-full px-4 py-3 text-xs text-red-500 dark:text-red-400 font-medium text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                Sair da família
              </button>
            </div>
          )}
        </div>

        {/* Totais da família (contexto geral, valores cheios) */}
        <div className="flex gap-3 px-4 mt-4">
          <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl px-3 py-2.5 text-center">
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wide">Entradas</p>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalEntradas)}</p>
          </div>
          <div className="flex-1 bg-red-50 dark:bg-red-900/20 rounded-2xl px-3 py-2.5 text-center">
            <p className="text-[10px] text-red-500 dark:text-red-400 font-medium uppercase tracking-wide">Saídas</p>
            <p className="text-sm font-bold text-red-500 dark:text-red-400">{formatCurrency(totalSaidas)}</p>
          </div>
        </div>

        {/* Saldo do usuário (Splitwise NET — minha parte líquida) */}
        {(() => {
          const isReceiver = meuNet > 0.01
          const isPayer    = meuNet < -0.01
          return (
            <div className="mx-4 mt-3">
              <div className={`rounded-2xl px-4 py-3 text-center border-2
                ${isReceiver
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/40'
                  : isPayer
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/40'
                    : 'bg-slate-50 dark:bg-slate-700/40 border-slate-200 dark:border-slate-700'}`}>
                <p className={`text-[10px] font-bold uppercase tracking-wide
                  ${isReceiver ? 'text-emerald-700 dark:text-emerald-400'
                    : isPayer ? 'text-amber-700 dark:text-amber-400'
                    : 'text-slate-500 dark:text-slate-400'}`}>
                  {isReceiver ? '↘ Você vai receber' : isPayer ? '↗ Você vai pagar' : '✓ Tudo quitado'}
                </p>
                <p className={`text-2xl font-extrabold mt-0.5
                  ${isReceiver ? 'text-emerald-700 dark:text-emerald-400'
                    : isPayer ? 'text-amber-700 dark:text-amber-400'
                    : 'text-slate-500 dark:text-slate-400'}`}>
                  {formatCurrency(Math.abs(meuNet))}
                </p>
                {(minhaFatiaEntradasPendentes > 0 || minhaFatiaSaidasPendentes > 0 || totalMeDevem > 0 || totalEuDevo > 0) && (
                  <div className="flex items-center justify-center gap-3 mt-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-medium flex-wrap">
                    {minhaFatiaEntradasPendentes > 0 && (
                      <span>Sua fatia entradas: {formatCurrency(minhaFatiaEntradasPendentes)}</span>
                    )}
                    {minhaFatiaSaidasPendentes > 0 && (
                      <span>Sua fatia saídas: {formatCurrency(minhaFatiaSaidasPendentes)}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* Saldos entre membros (Splitwise) */}
        {saldosArray.length > 0 && (
          <div className="mx-4 mt-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
            <button onClick={() => setShowSaldos(v => !v)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg flex-shrink-0">
                💰
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Acertos da família</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {totalMeDevem > 0 && (
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      ↘ Te devem {formatCurrency(totalMeDevem)}
                    </span>
                  )}
                  {totalEuDevo > 0 && (
                    <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                      ↗ Você deve {formatCurrency(totalEuDevo)}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-slate-400 text-xs flex-shrink-0">{showSaldos ? '▲' : '▼'}</span>
            </button>
            {showSaldos && (
              <div className="border-t border-slate-100 dark:border-slate-700">
                {saldosArray.map(s => {
                  const teDeve = s.valor > 0
                  return (
                    <div key={s.user_id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 dark:border-slate-700 last:border-0">
                      <Avatar nome={s.nome} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{s.nome}</p>
                        <p className={`text-[11px] font-medium ${teDeve ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {teDeve ? 'te deve' : 'você deve'}
                        </p>
                      </div>
                      <p className={`text-sm font-bold flex-shrink-0 ${teDeve ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {formatCurrency(Math.abs(s.valor))}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Lançamentos */}
        <div className="px-4 mt-4">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
            {MONTHS[month - 1]} · {lancamentos.length} {lancamentos.length === 1 ? 'lançamento' : 'lançamentos'}
          </p>
          {lancamentos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma conta neste mês</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Toque no + para adicionar</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lancamentos.map(item => {
                const isEntr   = item.tipo === 'Entrada'
                const divisao  = item.divisao ?? []
                const valorTot = Number(item.valor ?? 0)
                return (
                  <div key={item.id}
                    className={`bg-white dark:bg-slate-800 rounded-2xl border transition-all overflow-hidden
                      ${item.pago ? 'border-emerald-100 dark:border-emerald-900/30 opacity-70' : 'border-slate-100 dark:border-slate-700'}`}>
                    <div className="flex items-center gap-3 px-3 py-3">
                      <button onClick={() => handleToggle(item, !item.pago)}
                        className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all
                          ${item.pago ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-500'}`}>
                        {item.pago && (
                          <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${item.pago ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                          {item.descricao}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <p className="text-xs text-slate-400 dark:text-slate-500">{item.categoria}</p>
                          <span className="text-slate-300 dark:text-slate-600 text-xs">·</span>
                          <p className="text-xs text-slate-400 dark:text-slate-500">dia {item.data_vencimento.split('-')[2]}</p>
                          {item.pago && item.pago_por_nome && (
                            <>
                              <span className="text-slate-300 dark:text-slate-600 text-xs">·</span>
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 truncate">
                                ✓ pago por {item.pago_por_nome}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                      <p className={`text-sm font-bold flex-shrink-0 ${isEntr ? 'text-emerald-500' : 'text-red-500'}`}>
                        {isEntr ? '+' : '-'}{formatCurrency(item.valor)}
                      </p>
                      <button onClick={() => setEditingLancamento(item)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 dark:text-slate-600 hover:text-primary hover:bg-primary/5 transition-colors flex-shrink-0"
                        aria-label="Editar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(item.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                        aria-label="Excluir">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>

                    {/* Divisão entre membros */}
                    {divisao.length > 0 && (
                      <button type="button" onClick={() => setDivisaoTarget(item)}
                        className="w-full px-3 py-2 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors text-left">
                        <div className="flex -space-x-2 flex-shrink-0">
                          {divisao.slice(0, 5).map(d => (
                            <Avatar key={d.user_id} nome={d.nome} size="sm" />
                          ))}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {divisao.map(d =>
                              `${d.nome.split(' ')[0]} ${d.percentual.toFixed(0)}%`
                            ).join(' · ')}
                          </p>
                          <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium">
                            Toque para editar divisão
                          </p>
                        </div>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 flex-shrink-0">
                          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <button onClick={() => setShowAdd(true)}
        className="fixed w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center text-3xl font-light hover:bg-primary/90 active:scale-95 transition-all z-30"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom) + 5rem)',
          right: 'max(1rem, calc((100vw - 36rem) / 2 + 1rem))',
        }}>
        +
      </button>

      <NovoLancamentoSheet
        open={showAdd || !!editingLancamento}
        editingItem={editingLancamento}
        onClose={() => { setShowAdd(false); setEditingLancamento(null) }}
        onSave={handleSaveLancamento}
      />

      <EditarFamiliaSheet
        open={showEditar}
        familia={familia}
        onClose={() => setShowEditar(false)}
        onSave={async (updates) => {
          const r = await updateFamilia(familia.id, updates)
          if (r?.error) addToast(r.error, 'error')
          else addToast('Família atualizada!', 'success')
          return r
        }}
      />

      <DivisaoEditorSheet
        open={!!divisaoTarget}
        lancamento={divisaoTarget}
        membros={membros}
        onClose={() => setDivisaoTarget(null)}
        onSave={handleSaveDivisao}
      />

      <PagadorSheet
        open={!!pagadorTarget}
        lancamento={pagadorTarget}
        membros={membros}
        onClose={() => setPagadorTarget(null)}
        onConfirm={handleConfirmPagador}
      />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE RAIZ
// ══════════════════════════════════════════════════════════════════════════════
export default function FamiliaPage({ onConviteHandled, initialDetalheId, onDetalheClosed }) {
  const { isDark, toggleTheme } = useTheme()
  const { addToast, ToastContainer } = useToast()
  const {
    familia, familias, trocarFamilia,
    membros, convitesPendentes, convitesEnviados, loading,
    createFamilia, updateFamilia, convidarMembro, cancelarConviteEnviado,
    aceitarConvite, recusarConvite, sairDaFamilia, removerMembro,
  } = useFamilia()

  // null = lista, 'uuid' = detalhe da família selecionada
  const [detalheId, setDetalheId] = useState(null)

  // Deep-link: ao receber initialDetalheId, abre diretamente o detalhe
  useEffect(() => {
    if (initialDetalheId && familias.some(f => f.id === initialDetalheId)) {
      trocarFamilia(initialDetalheId)
      setDetalheId(initialDetalheId)
    }
  }, [initialDetalheId, familias, trocarFamilia])

  // Entra numa família
  const entrar = (id) => {
    trocarFamilia(id)
    setDetalheId(id)
  }

  // Volta para a lista
  const voltar = () => {
    setDetalheId(null)
    onDetalheClosed?.()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      <ToastContainer />

      {/* Tela de detalhe */}
      {detalheId && familia ? (
        <FamiliaDetailScreen
          familia={familia}
          membros={membros}
          convitesEnviados={convitesEnviados}
          isDark={isDark}
          toggleTheme={toggleTheme}
          onVoltar={voltar}
          convidarMembro={convidarMembro}
          cancelarConviteEnviado={cancelarConviteEnviado}
          removerMembro={removerMembro}
          sairDaFamilia={async () => {
            const r = await sairDaFamilia()
            if (!r?.error) voltar()
            return r
          }}
          updateFamilia={updateFamilia}
          addToast={addToast}
        />
      ) : (
        /* Tela de lista */
        <FamiliaListScreen
          familias={familias}
          convitesPendentes={convitesPendentes}
          loading={loading}
          isDark={isDark}
          toggleTheme={toggleTheme}
          onEntrar={entrar}
          onCriar={createFamilia}
          onEditar={async (id, updates) => {
            const r = await updateFamilia(id, updates)
            if (r?.error) addToast(r.error, 'error')
            else addToast('Família atualizada!', 'success')
            return r
          }}
          onAceitar={async (convite) => {
            const r = await aceitarConvite(convite)
            if (r?.error) { addToast(r.error, 'error'); return }
            addToast('Bem-vindo à família! 🎉', 'success')
            onConviteHandled?.()
          }}
          onRecusar={(convite) => {
            recusarConvite(convite)
            addToast('Convite recusado.', 'info')
          }}
        />
      )}
    </>
  )
}
