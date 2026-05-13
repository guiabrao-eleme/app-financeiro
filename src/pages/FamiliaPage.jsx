import { useState, useEffect, useCallback, useRef } from 'react'
import { useFamilia } from '../hooks/useFamilia'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../utils/format'
import { useToast } from '../components/ui/Toast'
import SkyToggle from '../components/ui/SkyToggle'
import MonthYearPicker from '../components/ui/MonthYearPicker'

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

// ─── Formulário criar família ─────────────────────────────────────────────────
function CriarFamiliaForm({ onCreate, onCancel }) {
  const [nome, setNome]     = useState('')
  const [saving, setSaving] = useState(false)
  const [erro, setErro]     = useState('')

  const handleCreate = async () => {
    if (!nome.trim()) return
    setSaving(true); setErro('')
    const result = await onCreate(nome)
    setSaving(false)
    if (result?.error) setErro(result.error)
  }

  return (
    <div className="space-y-3">
      <input type="text" value={nome} onChange={e => { setNome(e.target.value); setErro('') }}
        onKeyDown={e => e.key === 'Enter' && handleCreate()}
        placeholder="Nome da família (ex: Família Silva)"
        maxLength={40} autoFocus
        className={`w-full px-4 py-3 rounded-2xl border dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400 text-sm outline-none focus:ring-2 focus:ring-primary/10 font-medium transition-colors
          ${erro ? 'border-red-400 focus:border-red-400' : 'border-slate-200 dark:border-slate-600 focus:border-primary'}`} />
      {erro && (
        <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">⚠️ {erro}</p>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500 text-sm font-medium">
          Cancelar
        </button>
        <button type="button" onClick={handleCreate} disabled={!nome.trim() || saving}
          className="flex-1 py-3 rounded-2xl bg-primary text-white font-semibold text-sm disabled:opacity-50">
          {saving ? 'Criando...' : 'Criar'}
        </button>
      </div>
    </div>
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

// ─── Modal de adicionar lançamento ────────────────────────────────────────────
function NovoLancamentoSheet({ open, onClose, onSave }) {
  const [tipo, setTipo]     = useState('Saída')
  const [data, setData]     = useState(new Date().toISOString().split('T')[0])
  const [desc, setDesc]     = useState('')
  const [cat, setCat]       = useState('Outros')
  const [valor, setValor]   = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) { setTipo('Saída'); setDesc(''); setValor(''); setData(new Date().toISOString().split('T')[0]); setCat('Outros') }
  }, [open])

  if (!open) return null

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
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 rounded-t-3xl z-50 pb-safe">
        <div className="w-10 h-1 bg-slate-200 dark:bg-slate-600 rounded-full mx-auto mt-3 mb-4" />
        <div className="px-4 pb-6 space-y-4">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Nova conta da família</h3>
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
            {saving ? 'Salvando...' : 'Adicionar'}
          </button>
        </div>
      </div>
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TELA 1 — Lista de famílias
// ══════════════════════════════════════════════════════════════════════════════
function FamiliaListScreen({
  familias, convitesPendentes, loading,
  onEntrar, onCriar, onAceitar, onRecusar, isDark, toggleTheme,
}) {
  const [showCriar, setShowCriar]     = useState(false)
  const [actionLoading, setActionLoad] = useState(null) // id do convite em loading

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
                {familias.map(f => (
                  <button key={f.id} type="button" onClick={() => onEntrar(f.id)}
                    className="w-full flex items-center gap-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 px-5 py-4 text-left active:scale-[.98] transition-all shadow-sm hover:shadow-md">
                    {/* Ícone */}
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-2xl flex-shrink-0">
                      👨‍👩‍👧‍👦
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">{f.nome}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleColor(f.meu_role)}`}>
                          {roleLabel(f.meu_role)}
                        </span>
                      </div>
                    </div>
                    {/* Seta */}
                    <span className="text-slate-300 dark:text-slate-600 text-xl flex-shrink-0">›</span>
                  </button>
                ))}
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
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TELA 2 — Detalhe da família selecionada
// ══════════════════════════════════════════════════════════════════════════════
function FamiliaDetailScreen({
  familia, membros, convitesEnviados,
  isDark, toggleTheme, onVoltar,
  convidarMembro, cancelarConviteEnviado,
  removerMembro, sairDaFamilia,
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
  const [usuarioSelecionado, setUsuario] = useState(null)
  const [convidando, setConvidando]     = useState(false)
  const [showMembros, setShowMembros]   = useState(false)

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

  // Wrapper: insere e recarrega lista local
  const handleAddLancamento = useCallback(async (payload) => {
    if (!familia?.id) { addToast('Família não encontrada.', 'error'); return { error: 'sem família' } }
    const { data, error } = await supabase
      .from('lancamentos_familia')
      .insert({
        ...payload,
        familia_id:      familia.id,
        criado_por:      user.id,
        criado_por_nome: user.user_metadata?.full_name || user.email.split('@')[0],
      })
      .select()
      .single()
    if (error) { addToast(error.message, 'error'); return { error: error.message } }
    setLancamentos(prev =>
      [...prev, data].sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))
    )
    return { error: null }
  }, [familia?.id, user, addToast])

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

  const handleToggle = useCallback(async (id, pago) => {
    const pago_por_nome = pago
      ? (user.user_metadata?.full_name || user.email.split('@')[0])
      : null
    const { error } = await supabase
      .from('lancamentos_familia')
      .update({ pago, pago_por_nome })
      .eq('id', id)
    if (error) { addToast(error.message, 'error'); return }
    setLancamentos(prev => prev.map(l => l.id === id ? { ...l, pago, pago_por_nome } : l))
  }, [user, addToast])

  const handleSair = async () => {
    if (!window.confirm('Sair da família? Seus lançamentos compartilhados permanecem.')) return
    const result = await sairDaFamilia()
    if (result?.error) { addToast(result.error, 'error'); return }
    addToast('Você saiu da família.', 'info')
    onVoltar()
  }

  const totalEntradas = lancamentos.filter(l => l.tipo === 'Entrada').reduce((s,l) => s + Number(l.valor), 0)
  const totalSaidas   = lancamentos.filter(l => l.tipo === 'Saída').reduce((s,l) => s + Number(l.valor), 0)
  const totalPendente = lancamentos.filter(l => l.tipo === 'Saída' && !l.pago).reduce((s,l) => s + Number(l.valor), 0)

  return (
    <div className="min-h-screen bg-background flex flex-col page-enter">

      {/* Header */}
      <div className="bg-primary text-white px-4 pt-safe pb-4 shadow-md flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Botão voltar */}
            <button onClick={onVoltar}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 transition-colors text-lg font-bold">
              ‹
            </button>
            <div>
              <p className="text-white/60 text-xs font-medium uppercase tracking-wide leading-none mb-0.5">Família</p>
              <h1 className="text-lg font-extrabold leading-tight">{familia.nome}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SkyToggle checked={isDark} onChange={toggleTheme} />
            {familia.meu_role === 'admin' && (
              <button onClick={() => { setShowConvite(v => !v); setUsuario(null) }}
                className="text-xs bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg font-medium transition-colors">
                + Convidar
              </button>
            )}
          </div>
        </div>

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

        {/* Totais */}
        <div className="flex gap-3 px-4 mt-4">
          <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl px-3 py-2.5 text-center">
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wide">Entradas</p>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalEntradas)}</p>
          </div>
          <div className="flex-1 bg-red-50 dark:bg-red-900/20 rounded-2xl px-3 py-2.5 text-center">
            <p className="text-[10px] text-red-500 dark:text-red-400 font-medium uppercase tracking-wide">Saídas</p>
            <p className="text-sm font-bold text-red-500 dark:text-red-400">{formatCurrency(totalSaidas)}</p>
          </div>
          <div className="flex-1 bg-amber-50 dark:bg-amber-900/20 rounded-2xl px-3 py-2.5 text-center">
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wide">A pagar</p>
            <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{formatCurrency(totalPendente)}</p>
          </div>
        </div>

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
                const isEntr = item.tipo === 'Entrada'
                return (
                  <div key={item.id}
                    className={`bg-white dark:bg-slate-800 rounded-2xl border transition-all
                      ${item.pago ? 'border-emerald-100 dark:border-emerald-900/30 opacity-70' : 'border-slate-100 dark:border-slate-700'}`}>
                    <div className="flex items-center gap-3 px-3 py-3">
                      <button onClick={() => handleToggle(item.id, !item.pago)}
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
                          <span className="text-slate-300 dark:text-slate-600 text-xs">·</span>
                          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                            {item.pago ? `✓ pago por ${item.pago_por_nome}` : `por ${item.criado_por_nome}`}
                          </p>
                        </div>
                      </div>
                      <p className={`text-sm font-bold flex-shrink-0 ${isEntr ? 'text-emerald-500' : 'text-red-500'}`}>
                        {isEntr ? '+' : '-'}{formatCurrency(item.valor)}
                      </p>
                      <button onClick={() => handleDelete(item.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <button onClick={() => setShowAdd(true)}
        className="fixed right-4 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center text-2xl font-light hover:bg-primary/90 active:scale-95 transition-all z-30"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}>
        +
      </button>

      <NovoLancamentoSheet open={showAdd} onClose={() => setShowAdd(false)} onSave={handleAddLancamento} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE RAIZ
// ══════════════════════════════════════════════════════════════════════════════
export default function FamiliaPage({ onConviteHandled }) {
  const { isDark, toggleTheme } = useTheme()
  const { addToast, ToastContainer } = useToast()
  const {
    familia, familias, trocarFamilia,
    membros, convitesPendentes, convitesEnviados, loading,
    createFamilia, convidarMembro, cancelarConviteEnviado,
    aceitarConvite, recusarConvite, sairDaFamilia, removerMembro,
  } = useFamilia()

  // null = lista, 'uuid' = detalhe da família selecionada
  const [detalheId, setDetalheId] = useState(null)

  // Entra numa família
  const entrar = (id) => {
    trocarFamilia(id)
    setDetalheId(id)
  }

  // Volta para a lista
  const voltar = () => {
    setDetalheId(null)
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
