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

// ─── Modal de adicionar lançamento ────────────────────────────────────────────
function NovoLancamentoSheet({ open, onClose, onSave }) {
  const [tipo, setTipo]     = useState('Saída')
  const [data, setData]     = useState(new Date().toISOString().split('T')[0])
  const [desc, setDesc]     = useState('')
  const [cat, setCat]       = useState('Outros')
  const [valor, setValor]   = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setTipo('Saída'); setDesc(''); setValor('')
      setData(new Date().toISOString().split('T')[0]); setCat('Outros')
    }
  }, [open])

  if (!open) return null

  const handleSave = async () => {
    const num = parseFloat(valor.replace(',', '.'))
    if (!desc.trim() || isNaN(num) || num <= 0) return
    setSaving(true)
    await onSave({ tipo, data_vencimento: data, descricao: desc.trim(), categoria: cat, valor: num })
    setSaving(false)
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 rounded-t-3xl z-50 pb-safe">
        <div className="w-10 h-1 bg-slate-200 dark:bg-slate-600 rounded-full mx-auto mt-3 mb-4" />
        <div className="px-4 pb-6 space-y-4">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Nova conta da família</h3>

          {/* Tipo */}
          <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600">
            {['Saída','Entrada'].map(t => (
              <button key={t} type="button" onClick={() => setTipo(t)}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors
                  ${tipo === t
                    ? t === 'Saída' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                {t === 'Saída' ? '🔴 Saída' : '💚 Entrada'}
              </button>
            ))}
          </div>

          {/* Data */}
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Data de vencimento</label>
            <input type="date" value={data} onChange={e => setData(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
          </div>

          {/* Descrição */}
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Descrição</label>
            <input type="text" value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="Ex: Conta de luz, Supermercado..."
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
          </div>

          {/* Categoria */}
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

          {/* Valor */}
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

// ─── Card de convite pendente ─────────────────────────────────────────────────
function ConviteCard({ convite, onAceitar, onRecusar, loading }) {
  return (
    <div className="mx-4 mt-6 bg-primary/5 dark:bg-primary/10 border-2 border-primary/20 rounded-3xl p-5 text-center">
      <div className="text-4xl mb-3">👨‍👩‍👧‍👦</div>
      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
        Convite para família
      </p>
      <p className="text-2xl font-extrabold text-primary mb-1">{convite.familia_nome}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
        <strong className="text-slate-600 dark:text-slate-300">{convite.convidado_por_nome}</strong> te convidou para compartilhar as finanças da família
      </p>
      <div className="flex gap-3">
        <button type="button" onClick={onRecusar} disabled={loading}
          className="flex-1 py-3 rounded-2xl border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 font-semibold text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50">
          Recusar
        </button>
        <button type="button" onClick={onAceitar} disabled={loading}
          className="flex-1 py-3 rounded-2xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {loading
            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : '✓ Entrar na família'
          }
        </button>
      </div>
    </div>
  )
}

// ─── Tela sem família ─────────────────────────────────────────────────────────
function SetupFamilia({ onCreate }) {
  const [nome, setNome]     = useState('')
  const [saving, setSaving] = useState(false)
  const [show, setShow]     = useState(false)
  const [erro, setErro]     = useState('')

  const handleCreate = async () => {
    if (!nome.trim()) return
    setSaving(true)
    setErro('')
    const result = await onCreate(nome)
    setSaving(false)
    if (result?.error) setErro(result.error)
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-8 py-16 text-center">
      <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
      <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">Crie a sua família</h2>
      <p className="text-sm text-slate-400 dark:text-slate-500 mb-8 leading-relaxed">
        Crie um grupo familiar para compartilhar e gerenciar contas juntos. Convide membros pelo e-mail de login deles.
      </p>

      {!show ? (
        <button type="button" onClick={() => setShow(true)}
          className="px-8 py-3.5 bg-primary text-white rounded-2xl font-semibold text-sm hover:bg-primary/90 transition-colors">
          Criar família
        </button>
      ) : (
        <div className="w-full space-y-3">
          <input type="text" value={nome} onChange={e => { setNome(e.target.value); setErro('') }}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Nome da família (ex: Família Silva)"
            maxLength={40} autoFocus
            className={`w-full px-4 py-3 rounded-2xl border dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400 text-sm outline-none focus:ring-2 focus:ring-primary/10 text-center font-medium transition-colors
              ${erro ? 'border-red-400 dark:border-red-600 focus:border-red-400' : 'border-slate-200 dark:border-slate-600 focus:border-primary'}`} />
          {erro && (
            <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2 text-center">
              ⚠️ {erro}
            </p>
          )}
          <button type="button" onClick={handleCreate} disabled={!nome.trim() || saving}
            className="w-full py-3 rounded-2xl bg-primary text-white font-semibold text-sm disabled:opacity-50">
            {saving ? 'Criando...' : 'Criar'}
          </button>
          <button type="button" onClick={() => { setShow(false); setErro('') }}
            className="w-full py-2 text-sm text-slate-400 dark:text-slate-500">
            Cancelar
          </button>
        </div>
      )}
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

  // Carrega ao montar
  useEffect(() => { search('') }, [search])

  // Debounce na busca
  useEffect(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(busca.trim()), 300)
    return () => clearTimeout(timerRef.current)
  }, [busca, search])

  return (
    <div className="space-y-2">
      {/* Campo de busca */}
      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl px-3 py-3">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-slate-400 flex-shrink-0">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          className="flex-1 text-sm bg-transparent outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
        />
        {busca ? (
          <button onClick={() => setBusca('')} className="text-slate-400 text-lg leading-none px-1">×</button>
        ) : null}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : results.length === 0 ? (
        <p className="text-center text-sm text-slate-400 dark:text-slate-500 py-4">
          {busca ? 'Nenhum usuário encontrado' : 'Nenhum outro usuário cadastrado'}
        </p>
      ) : (
        results.map(u => (
          <button
            key={u.id}
            type="button"
            onClick={() => onSelect(u)}
            className="w-full flex items-center gap-3 bg-slate-50 dark:bg-slate-700/60 rounded-2xl px-3 py-3 text-left active:bg-primary/10 dark:active:bg-primary/20"
          >
            <Avatar nome={u.nome} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{u.nome}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{u.email}</p>
            </div>
            <span className="text-xs text-primary font-semibold flex-shrink-0">Convidar</span>
          </button>
        ))
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function FamiliaPage({ onConviteHandled }) {
  const { isDark, toggleTheme } = useTheme()
  const { user } = useAuth()
  const { addToast, ToastContainer } = useToast()
  const {
    familia, membros, convitePendente, lancamentos, loading,
    fetchLancamentos, createFamilia, convidarMembro,
    aceitarConvite, recusarConvite, sairDaFamilia, removerMembro,
    addLancamento, deleteLancamento, togglePago,
  } = useFamilia()

  const now   = new Date()
  const [year, setYear]     = useState(now.getFullYear())
  const [month, setMonth]   = useState(now.getMonth() + 1)
  const [showAdd, setShowAdd]           = useState(false)
  const [showConvite, setShowConvite]   = useState(false)
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null)
  const [convidando, setConvidando]     = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [showMembros, setShowMembros] = useState(false)

  useEffect(() => {
    if (familia) fetchLancamentos(year, month)
  }, [familia, year, month, fetchLancamentos])

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const handleAceitar = async () => {
    setActionLoading(true)
    const result = await aceitarConvite()
    setActionLoading(false)
    if (result?.error) { addToast(result.error, 'error'); return }
    addToast('Bem-vindo à família! 🎉', 'success')
    onConviteHandled?.()
  }

  const handleRecusar = async () => {
    await recusarConvite()
    onConviteHandled?.()
    addToast('Convite recusado.', 'info')
  }

  const handleConvite = async () => {
    if (!usuarioSelecionado) return
    setConvidando(true)
    const result = await convidarMembro(usuarioSelecionado.email)
    setConvidando(false)
    if (result?.error) { addToast(result.error, 'error'); return }
    addToast(`Convite enviado para ${usuarioSelecionado.nome}! Quando ele(a) abrir o app verá o convite.`, 'success')
    setUsuarioSelecionado(null)
    setShowConvite(false)
  }

  const handleSair = async () => {
    if (!window.confirm('Tem certeza que deseja sair da família? Seus lançamentos compartilhados não serão excluídos.')) return
    const result = await sairDaFamilia()
    if (result?.error) { addToast(result.error, 'error'); return }
    addToast('Você saiu da família.', 'info')
  }

  const totalEntradas = lancamentos.filter(l => l.tipo === 'Entrada').reduce((s,l) => s + Number(l.valor), 0)
  const totalSaidas   = lancamentos.filter(l => l.tipo === 'Saída').reduce((s,l) => s + Number(l.valor), 0)
  const totalPendente = lancamentos.filter(l => l.tipo === 'Saída' && !l.pago).reduce((s,l) => s + Number(l.valor), 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center page-enter">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Sem família ────────────────────────────────────────────────────────────
  if (!familia) {
    return (
      <div className="min-h-screen bg-background flex flex-col page-enter">
        <ToastContainer />
        <div className="bg-primary text-white px-4 pt-safe pb-4 shadow-md flex-shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold">👨‍👩‍👧‍👦 Família</h1>
            <SkyToggle checked={isDark} onChange={toggleTheme} />
          </div>
        </div>

        {/* Convite pendente */}
        {convitePendente && (
          <ConviteCard
            convite={convitePendente}
            onAceitar={handleAceitar}
            onRecusar={handleRecusar}
            loading={actionLoading}
          />
        )}

        {/* Setup sem convite */}
        {!convitePendente && (
          <SetupFamilia onCreate={createFamilia} />
        )}
      </div>
    )
  }

  // ── Em família ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col page-enter">
      <ToastContainer />

      {/* Header */}
      <div className="bg-primary text-white px-4 pt-safe pb-4 shadow-md flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white/60 text-xs font-medium uppercase tracking-wide leading-none mb-0.5">Família</p>
            <h1 className="text-lg font-extrabold leading-tight">{familia.nome}</h1>
          </div>
          <div className="flex items-center gap-2">
            <SkyToggle checked={isDark} onChange={toggleTheme} />
            {familia.meu_role === 'admin' && (
              <button onClick={() => setShowConvite(v => !v)}
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

        {/* ── Painel de convite (admin) ── */}
        {showConvite && (
          <div className="mx-4 mt-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Convidar membro</p>
              <button
                onClick={() => { setShowConvite(false); setUsuarioSelecionado(null) }}
                className="text-slate-400 dark:text-slate-500 text-lg leading-none px-1"
              >×</button>
            </div>

            {/* Usuário já selecionado → mostra card + botão confirmar */}
            {usuarioSelecionado ? (
              <>
                <div className="flex items-center gap-3 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl px-3 py-3">
                  <Avatar nome={usuarioSelecionado.nome} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{usuarioSelecionado.nome}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{usuarioSelecionado.email}</p>
                  </div>
                  <button onClick={() => setUsuarioSelecionado(null)}
                    className="text-slate-400 hover:text-red-400 text-lg leading-none px-1">×</button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setUsuarioSelecionado(null)}
                    className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500 text-sm font-medium">
                    Voltar
                  </button>
                  <button onClick={handleConvite} disabled={convidando}
                    className="flex-1 py-3 bg-primary text-white rounded-2xl text-sm font-semibold disabled:opacity-50">
                    {convidando ? 'Enviando...' : '✓ Confirmar convite'}
                  </button>
                </div>
              </>
            ) : (
              /* Lista inline de usuários */
              <UserPickerInline
                membroEmails={[...(membros.map(m => m.email)), user?.email].filter(Boolean)}
                onSelect={u => setUsuarioSelecionado(u)}
              />
            )}
          </div>
        )}

        {/* ── Membros ── */}
        <div className="mx-4 mt-4">
          <button onClick={() => setShowMembros(v => !v)}
            className="w-full flex items-center justify-between bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {membros.slice(0, 4).map(m => (
                  <Avatar key={m.id} nome={m.nome} size="sm" />
                ))}
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

        {/* ── Totais ── */}
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

        {/* ── Lista de lançamentos ── */}
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
                      ${item.pago
                        ? 'border-emerald-100 dark:border-emerald-900/30 opacity-70'
                        : 'border-slate-100 dark:border-slate-700'}`}
                  >
                    <div className="flex items-center gap-3 px-3 py-3">
                      {/* Checkbox pago */}
                      <button
                        onClick={() => togglePago(item.id, !item.pago)}
                        className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all
                          ${item.pago
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'border-slate-300 dark:border-slate-500'}`}
                      >
                        {item.pago && (
                          <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`text-sm font-semibold truncate
                            ${item.pago
                              ? 'text-slate-400 dark:text-slate-500 line-through'
                              : 'text-slate-800 dark:text-slate-200'}`}>
                            {item.descricao}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            {item.categoria}
                          </p>
                          <span className="text-slate-300 dark:text-slate-600 text-xs">·</span>
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            dia {item.data_vencimento.split('-')[2]}
                          </p>
                          <span className="text-slate-300 dark:text-slate-600 text-xs">·</span>
                          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                            {item.pago
                              ? `✓ pago por ${item.pago_por_nome}`
                              : `por ${item.criado_por_nome}`}
                          </p>
                        </div>
                      </div>

                      <p className={`text-sm font-bold flex-shrink-0 ${isEntr ? 'text-emerald-500' : 'text-red-500'}`}>
                        {isEntr ? '+' : '-'}{formatCurrency(item.valor)}
                      </p>

                      <button onClick={() => deleteLancamento(item.id)}
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

      <NovoLancamentoSheet
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={addLancamento}
      />

    </div>
  )
}
