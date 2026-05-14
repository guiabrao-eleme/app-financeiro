import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { formatCurrency } from '../../utils/format'
import { useToast } from '../ui/Toast'
import CurrencyInput from './CurrencyInput'
import { useCategories } from '../../hooks/useCategories'
import { useCartoes, COR_MAP, getCorMeta } from '../../hooks/useCartoes'
import { useGoogleCalendar } from '../../hooks/useGoogleCalendar'
import { useSwipeDown } from '../../utils/useSwipeDown'

const EMOJIS_SUGERIDOS = [
  '🏠','🚗','🎓','🛍️','💰','📚','💼','🍀','🍕','✈️',
  '🏥','💊','🎮','🎬','🐕','🎂','💄','👗','👟','💻',
  '📱','🎵','🌮','🍔','🛒','⚽','🎁','💡','🔧','🎯',
  '🏋️','🌟','☕','🍷','🏖️','📦','💸','🎪','🎨','🔑',
]

const EMOJIS_BANCO = [
  '🏦','💳','💵','💴','💶','💷','🪙','💰','🏧','📲',
  '🟣','🟢','🔵','🟡','🟠','🔴','⚫','🟤',
]

const CORES_BANCO = [
  { id: 'slate',  label: 'Cinza',   dot: 'bg-slate-400' },
  { id: 'purple', label: 'Roxo',    dot: 'bg-purple-500' },
  { id: 'blue',   label: 'Azul',    dot: 'bg-blue-500' },
  { id: 'green',  label: 'Verde',   dot: 'bg-green-500' },
  { id: 'pink',   label: 'Rosa',    dot: 'bg-pink-500' },
  { id: 'orange', label: 'Laranja', dot: 'bg-orange-500' },
  { id: 'red',    label: 'Vermelho',dot: 'bg-red-500' },
  { id: 'yellow', label: 'Amarelo', dot: 'bg-yellow-400' },
]

const todayStr = () => new Date().toISOString().split('T')[0]

const addMonths = (dateStr, months) => {
  const d = new Date(dateStr + 'T12:00:00')
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0]
}

const MESES_INFINITO = 120

const EMPTY_FORM = {
  data: todayStr(),
  descricao: '',
  tipo: 'Saída',
  categoria: '',
  cartao_id: null,
  valor: 0,
  repeticao: 'unico',
  meses: 12,
  infinito: false,
  notificar: false,
  dias_aviso: 1,
}

// ─── Formulário de nova categoria ────────────────────────────────────────────
function NewCategoryForm({ tipo, onCreated, onCancel, createCategory }) {
  const [nome, setNome] = useState('')
  const [icone, setIcone] = useState('📦')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100) }, [])

  const handleSave = async () => {
    if (!nome.trim()) return
    setSaving(true)
    const catTipo = tipo === 'Entrada' ? 'Entrada' : 'Saída'
    const { data, error } = await createCategory({ nome, icone, tipo: catTipo })
    setSaving(false)
    if (!error && data) onCreated(data.nome)
  }

  return (
    <div className="mt-3 bg-slate-50 dark:bg-slate-700 rounded-2xl p-4 border border-slate-200 dark:border-slate-600 space-y-3">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Nova categoria</p>

      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
        {EMOJIS_SUGERIDOS.map(e => (
          <button
            key={e} type="button" onClick={() => setIcone(e)}
            className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all
              ${icone === e ? 'bg-primary/15 ring-2 ring-primary scale-110' : 'bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 hover:bg-slate-100 dark:hover:bg-slate-500'}`}
          >
            {e}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl flex-shrink-0">
          {icone}
        </div>
        <input
          ref={inputRef}
          type="text" value={nome}
          onChange={e => setNome(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="Nome da categoria..."
          maxLength={30}
          className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-500 dark:bg-slate-600 dark:text-slate-100 dark:placeholder-slate-400 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
        />
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

// ─── Formulário de novo cartão ────────────────────────────────────────────────
function NewCartaoForm({ onCreated, onCancel, createCartao }) {
  const [nome, setNome] = useState('')
  const [icone, setIcone] = useState('🏦')
  const [cor, setCor] = useState('slate')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100) }, [])

  const handleSave = async () => {
    if (!nome.trim()) return
    setSaving(true)
    const { data, error } = await createCartao({ nome, icone, cor })
    setSaving(false)
    if (!error && data) onCreated(data)
  }

  return (
    <div className="mt-3 bg-slate-50 dark:bg-slate-700 rounded-2xl p-4 border border-slate-200 dark:border-slate-600 space-y-3">
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

// ─── Stepper de meses ─────────────────────────────────────────────────────────
function MesesStepper({ value, onChange, disabled }) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState('')
  const inputRef = useRef(null)

  const startEdit = () => {
    if (disabled) return
    setRaw(String(value))
    setEditing(true)
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 50)
  }

  const commitEdit = () => {
    const n = parseInt(raw, 10)
    if (!isNaN(n)) onChange(Math.max(2, Math.min(600, n)))
    setEditing(false)
  }

  return (
    <div className={`flex items-center gap-3 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <button type="button"
        onClick={() => onChange(Math.max(2, value - 1))}
        className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center justify-center text-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all">
        −
      </button>

      <div className="flex-1 text-center" onClick={startEdit}>
        {editing ? (
          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            value={raw}
            onChange={e => setRaw(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitEdit() } }}
            className="w-20 text-center text-2xl font-bold text-slate-800 dark:text-slate-100 outline-none bg-transparent border-b-2 border-primary"
          />
        ) : (
          <span className="text-2xl font-bold text-slate-800 dark:text-slate-100 cursor-pointer border-b-2 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 transition-all">
            {value}
          </span>
        )}
        <span className="text-slate-400 dark:text-slate-500 text-sm ml-1">meses</span>
      </div>

      <button type="button"
        onClick={() => onChange(Math.min(600, value + 1))}
        className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center justify-center text-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all">
        +
      </button>
    </div>
  )
}

// ─── Modal principal ──────────────────────────────────────────────────────────
export default function NovoRegistroModal({
  open,
  onClose,
  onSaved,
  editItem = null,
  editEscopo = 'apenas_este',
}) {
  const { user } = useAuth()
  const { addToast, ToastContainer } = useToast()
  const { categories, loading: catsLoading, deleteCategory, createCategory } = useCategories()
  const { cartoes, loading: cartoesLoading, createCartao, deleteCartao } = useCartoes()
  const gcal = useGoogleCalendar()
  const isEdit = !!editItem

  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [visible, setVisible] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [creating, setCreating] = useState(false)       // nova categoria
  const [creatingCartao, setCreatingCartao] = useState(false) // novo cartão

  // Reseta minimização quando abre
  useEffect(() => { if (open) setMinimized(false) }, [open])

  // Swipe down para minimizar (só ativo quando expandido)
  const { sheetRef, swipeStyle, touchHandlers } = useSwipeDown(
    () => setMinimized(true),
    visible && !minimized
  )

  // Scroll lock iOS — comportamento original (só depende de open)
  useEffect(() => {
    if (open) {
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflowY = 'scroll'
      setTimeout(() => setVisible(true), 10)
    } else {
      const scrollY = parseInt(document.body.style.top || '0') * -1
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflowY = ''
      window.scrollTo(0, scrollY)
      setVisible(false)
    }
    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflowY = ''
    }
  }, [open])


  useEffect(() => {
    if (!open) return
    if (isEdit) {
      setForm({
        data: editItem.data_vencimento,
        descricao: editItem.descricao,
        tipo: editItem.tipo,
        categoria: editItem.categoria,
        cartao_id: editItem.cartao_id ?? null,
        valor: Number(editItem.valor),
        repeticao: 'unico',
        meses: 12,
        infinito: false,
        notificar: editItem.notificar ?? false,
        dias_aviso: editItem.dias_aviso ?? 1,
      })
    } else {
      setForm({ ...EMPTY_FORM, data: todayStr() })
    }
    setErrors({})
    setCreating(false)
    setCreatingCartao(false)
  }, [open, isEdit, editItem])

  if (!open) return null

  const catsParaTipo = categories.filter(c => c.tipo === form.tipo || c.tipo === 'Ambos')

  const validate = () => {
    const errs = {}
    // Sanitize and validate inputs
    if (!form.data) errs.data = 'Data obrigatória'
    else if (isNaN(Date.parse(form.data))) errs.data = 'Data inválida'

    if (!form.descricao || !form.descricao.trim()) errs.descricao = 'Descrição obrigatória'
    else if (form.descricao.length > 255) errs.descricao = 'Descrição muito longa (máx 255)'
    else if (/[<>]/.test(form.descricao)) errs.descricao = 'Caracteres inválidos na descrição'

    if (!form.categoria) errs.categoria = 'Selecione uma categoria'
    if (!form.valor || isNaN(form.valor) || form.valor <= 0 || form.valor > 999999999) errs.valor = 'Informe um valor válido'
    return errs
  }

  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSaving(true)
    try {
      if (isEdit) {
        if (editEscopo === 'este_e_proximos' && editItem.grupo_recorrente) {
          const { error: bulkError } = await supabase
            .from('lancamentos')
            .update({
              descricao: form.descricao.trim(),
              tipo: form.tipo,
              categoria: form.categoria,
              cartao_id: form.cartao_id,
              valor: form.valor,
              notificar: form.notificar,
              dias_aviso: form.dias_aviso,
            })
            .eq('grupo_recorrente', editItem.grupo_recorrente)
            .gte('data_vencimento', editItem.data_vencimento)
          if (bulkError) throw bulkError

          const { error: dateError } = await supabase
            .from('lancamentos')
            .update({ data_vencimento: form.data })
            .eq('id', editItem.id)
          if (dateError) throw dateError

          addToast('Registros futuros atualizados!', 'success')
        } else {
          const { error } = await supabase
            .from('lancamentos')
            .update({
              data_vencimento: form.data,
              descricao: form.descricao.trim(),
              tipo: form.tipo,
              categoria: form.categoria,
              cartao_id: form.cartao_id,
              valor: form.valor,
              notificar: form.notificar,
              dias_aviso: form.dias_aviso,
            })
            .eq('id', editItem.id)
          if (error) throw error

          // Sincroniza edição com Google Calendar em background
          if (gcal.connected) {
            gcal.updateEvent({
              ...editItem,
              data_vencimento: form.data,
              descricao: form.descricao.trim(),
              tipo: form.tipo,
              categoria: form.categoria,
              valor: form.valor,
              notificar: form.notificar,
              dias_aviso: form.dias_aviso,
            }).catch(console.warn)
          }

          addToast('Registro atualizado!', 'success')
        }
      } else {
        const isRepetindo = form.repeticao !== 'unico'
        const n = isRepetindo
          ? (form.infinito ? MESES_INFINITO : form.meses)
          : 1
        const isParcelado = form.repeticao === 'parcelado'
        const valorUnitario = isParcelado
          ? parseFloat((form.valor / n).toFixed(2))
          : form.valor

        let grupoId = null
        if (isRepetindo && typeof crypto !== 'undefined' && crypto.randomUUID) {
          grupoId = crypto.randomUUID()
        }

        const recsCompletos = Array.from({ length: n }, (_, i) => ({
          user_id: user.id,
          data_registro: form.data,
          data_vencimento: addMonths(form.data, i),
          descricao: form.descricao.trim(),
          tipo: form.tipo,
          categoria: form.categoria,
          cartao_id: form.cartao_id,
          valor: valorUnitario,
          valor_total: form.valor,
          parcela_atual: i + 1,
          total_parcelas: n,
          notificar: form.notificar,
          dias_aviso: form.dias_aviso,
          ...(grupoId && { grupo_recorrente: grupoId, tipo_repeticao: form.repeticao }),
        }))

        const recsSemGrupo = Array.from({ length: n }, (_, i) => ({
          user_id: user.id,
          data_registro: form.data,
          data_vencimento: addMonths(form.data, i),
          descricao: form.descricao.trim(),
          tipo: form.tipo,
          categoria: form.categoria,
          cartao_id: form.cartao_id,
          valor: valorUnitario,
          valor_total: form.valor,
          parcela_atual: i + 1,
          total_parcelas: n,
          notificar: form.notificar,
          dias_aviso: form.dias_aviso,
        }))

        let lastError = null
        let savedRecords = null
        for (const tentativa of [recsCompletos, recsSemGrupo]) {
          const { data, error } = await supabase.from('lancamentos').insert(tentativa).select()
          if (!error) { lastError = null; savedRecords = data; break }
          lastError = error
          if (!error.message?.includes('does not exist') && !error.message?.includes('column')) break
        }

        if (lastError) throw lastError

        // Sincroniza com Google Calendar em background (não bloqueia o app)
        if (gcal.connected && savedRecords?.length) {
          gcal.createEvents(savedRecords).catch(console.warn)
        }

        const msg = isParcelado
          ? `${n} parcelas de ${formatCurrency(valorUnitario)} criadas!`
          : n > 1
            ? `${n} meses recorrentes criados!`
            : 'Registro salvo!'
        addToast(msg, 'success')
      }
      setTimeout(() => { onSaved(); handleClose() }, 1000)
    } catch (err) {
      console.error('Erro ao salvar:', err)
      const msg = err?.message || err?.details || 'Erro desconhecido'
      addToast(`Erro: ${msg}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setVisible(false)
    setCreating(false)
    setCreatingCartao(false)
    setTimeout(onClose, 280)
  }

  const set = (field, val) => {
    setForm(prev => ({ ...prev, [field]: val }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const handleDeleteCat = async (e, id, nome) => {
    e.stopPropagation()
    await deleteCategory(id)
    if (form.categoria === nome) set('categoria', '')
  }

  const handleDeleteCartao = async (e, id) => {
    e.stopPropagation()
    await deleteCartao(id)
    if (form.cartao_id === id) set('cartao_id', null)
  }

  const mesesToUse = form.infinito ? MESES_INFINITO : form.meses
  const valorUnitario = form.repeticao === 'parcelado' && mesesToUse > 1
    ? form.valor / mesesToUse : form.valor
  const totalGeral = form.repeticao !== 'unico'
    ? form.repeticao === 'parcelado' ? form.valor : form.valor * mesesToUse
    : form.valor

  const showEscopoBadge = isEdit && editItem?.grupo_recorrente

  return (
    <>
      <ToastContainer />
      {!minimized && (
        <div
          className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
          onClick={handleClose}
        />
      )}
      <div
        ref={sheetRef}
        {...touchHandlers}
        className={`fixed left-1/2 z-50 bg-white dark:bg-slate-800 shadow-2xl transition-all duration-300 ease-out
          ${minimized
            ? 'rounded-3xl w-[calc(100%-2rem)] max-w-md max-h-[5.5rem] overflow-hidden'
            : `bottom-0 rounded-t-3xl w-full max-w-xl max-h-[92vh] overflow-y-auto pb-safe
                ${visible ? '' : 'translate-y-full'}`}`}
        style={{
          ...(minimized
            ? {
                ...swipeStyle,
                bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)',
              }
            : {
                ...swipeStyle,
                transform: visible
                  ? swipeStyle.transform
                  : 'translate(-50%, 100%)',
              }),
        }}
      >
        {/* Handle de minimizar/expandir (clicável) */}
        <button type="button" onClick={() => setMinimized(v => !v)}
          className={`w-full flex flex-col items-center active:bg-slate-50 dark:active:bg-slate-700/40
            ${minimized ? 'py-4 px-4' : 'pt-3 pb-1'}`}
          aria-label={minimized ? 'Expandir' : 'Minimizar'}>
          <div className={`bg-slate-300 dark:bg-slate-500 rounded-full
            ${minimized ? 'w-16 h-1.5 mb-2' : 'w-10 h-1'}`} />
          {minimized && (
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {isEdit ? 'Editar Registro' : 'Novo Registro'}
              </p>
              <span className="text-slate-400 dark:text-slate-500 text-xs">↑ toque para expandir</span>
            </div>
          )}
        </button>

        {!minimized && (
        <>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
              {isEdit ? 'Editar Registro' : 'Novo Registro'}
            </h2>
            {showEscopoBadge && (
              <p className={`text-xs mt-0.5 font-medium ${editEscopo === 'este_e_proximos' ? 'text-primary' : 'text-slate-400'}`}>
                {editEscopo === 'este_e_proximos' ? '📅 Editando este e os próximos' : '📌 Editando apenas este'}
              </p>
            )}
          </div>
          <button onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600">
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-5 pb-10">

          {/* ── Tipo ── */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tipo</label>
            <div className="flex bg-slate-100 dark:bg-slate-700 rounded-xl p-1 gap-1">
              {['Entrada', 'Saída'].map(tipo => (
                <button key={tipo} type="button"
                  onClick={() => { set('tipo', tipo); set('categoria', ''); set('repeticao', 'unico') }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all
                    ${form.tipo === tipo
                      ? tipo === 'Entrada' ? 'bg-success text-white shadow-sm' : 'bg-danger text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  {tipo === 'Entrada' ? '↑ Entrada' : '↓ Saída'}
                </button>
              ))}
            </div>
          </div>

          {/* ── Cartão / Conta ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Cartão / Conta
                <span className="ml-1.5 text-xs text-slate-400 dark:text-slate-500 font-normal">opcional</span>
              </label>
            </div>

            {cartoesLoading ? (
              <div className="h-10 flex items-center text-slate-400 dark:text-slate-500 text-sm">Carregando...</div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                {/* Opção "Nenhum" */}
                <button
                  type="button"
                  onClick={() => set('cartao_id', null)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all
                    ${form.cartao_id === null
                      ? 'bg-slate-200 dark:bg-slate-600 border-slate-300 dark:border-slate-500 text-slate-700 dark:text-slate-200'
                      : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500'}`}
                >
                  —
                  <span>Nenhum</span>
                </button>

                {/* Cartões cadastrados */}
                {cartoes.map(c => {
                  const meta = getCorMeta(c.cor)
                  const isSelected = form.cartao_id === c.id
                  return (
                    <div key={c.id} className="relative flex-shrink-0 group">
                      <button
                        type="button"
                        onClick={() => set('cartao_id', c.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all
                          ${isSelected
                            ? `${meta.bg} ${meta.text} border-transparent ring-2 ring-offset-1 ring-primary/40`
                            : `bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 ${meta.text}`}`}
                      >
                        <span>{c.icone}</span>
                        <span>{c.nome}</span>
                      </button>
                      {/* Botão excluir */}
                      <button
                        type="button"
                        onClick={e => handleDeleteCartao(e, c.id)}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-danger text-white rounded-full text-[9px]
                          opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-sm z-10"
                        title="Remover"
                      >✕</button>
                    </div>
                  )
                })}

                {/* Botão adicionar novo */}
                {!creatingCartao && (
                  <button
                    type="button"
                    onClick={() => setCreatingCartao(true)}
                    className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold border-2 border-dashed border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:border-primary hover:text-primary transition-all"
                  >
                    <span className="text-base leading-none">＋</span>
                    <span>Novo</span>
                  </button>
                )}
              </div>
            )}

            {creatingCartao && (
              <NewCartaoForm
                createCartao={createCartao}
                onCreated={(cartao) => { set('cartao_id', cartao.id); setCreatingCartao(false) }}
                onCancel={() => setCreatingCartao(false)}
              />
            )}
          </div>

          {/* ── Data ── */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {isEdit ? 'Data de vencimento' : 'Data'}
            </label>
            <div className="flex gap-2">
              <input type="date" value={form.data} onChange={e => set('data', e.target.value)}
                className={`flex-1 px-4 py-3 rounded-xl border text-sm outline-none transition-all dark:bg-slate-700 dark:text-slate-100
                  ${errors.data ? 'border-danger bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-600 focus:border-primary focus:ring-2 focus:ring-primary/10'}`}
              />
              {!isEdit && (
                <button type="button" onClick={() => set('data', todayStr())}
                  className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-primary font-medium hover:bg-primary/5 whitespace-nowrap dark:hover:bg-primary/20">
                  Hoje
                </button>
              )}
            </div>
            {errors.data && <p className="text-danger text-xs mt-1">{errors.data}</p>}
          </div>

          {/* ── Descrição ── */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Descrição</label>
            <input type="text" value={form.descricao} onChange={e => set('descricao', e.target.value)}
              placeholder="Ex: Mercado, Salário, Conta de luz..."
              className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400
                ${errors.descricao ? 'border-danger bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-600 focus:border-primary focus:ring-2 focus:ring-primary/10'}`}
            />
            {errors.descricao && <p className="text-danger text-xs mt-1">{errors.descricao}</p>}
          </div>

          {/* ── Categoria ── */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Categoria</label>

            {catsLoading ? (
              <div className="h-16 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">Carregando...</div>
            ) : catsParaTipo.length === 0 && !creating ? (
              <div className="text-center py-4 text-slate-400 text-sm">
                <p className="mb-3">Nenhuma categoria ainda.</p>
                <button type="button" onClick={() => setCreating(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 text-primary font-semibold text-sm">
                  <span className="text-lg">＋</span> Criar primeira categoria
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {catsParaTipo.map(cat => {
                  const isSelected = form.categoria === cat.nome
                  return (
                    <div key={cat.id} className="relative group">
                      <button type="button" onClick={() => set('categoria', cat.nome)}
                        className={`w-full flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border text-xs font-medium transition-all
                          ${isSelected
                            ? 'border-primary bg-primary/5 dark:bg-primary/20 text-primary ring-2 ring-primary/20'
                            : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                      >
                        <span className="text-2xl">{cat.icone}</span>
                        <span className="text-[11px] leading-tight text-center line-clamp-2">{cat.nome}</span>
                      </button>
                      <button type="button"
                        onClick={e => handleDeleteCat(e, cat.id, cat.nome)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-danger text-white rounded-full text-[10px] font-bold
                          opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-sm z-10"
                        title="Remover categoria"
                      >✕</button>
                    </div>
                  )
                })}
                {!creating && (
                  <button type="button" onClick={() => setCreating(true)}
                    className="flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:border-primary hover:text-primary transition-all">
                    <span className="text-2xl">＋</span>
                    <span className="text-[11px]">Nova</span>
                  </button>
                )}
              </div>
            )}

            {errors.categoria && <p className="text-danger text-xs mt-1">{errors.categoria}</p>}

            {creating && (
              <NewCategoryForm
                tipo={form.tipo}
                createCategory={createCategory}
                onCreated={(nome) => { set('categoria', nome); setCreating(false) }}
                onCancel={() => setCreating(false)}
              />
            )}
          </div>

          {/* ── Valor ── */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {form.repeticao === 'parcelado' ? 'Valor total' : 'Valor'}
            </label>
            <CurrencyInput value={form.valor} onChange={val => set('valor', val)} error={errors.valor} />
            {errors.valor && <p className="text-danger text-xs mt-1">{errors.valor}</p>}
          </div>

          {/* ── Aviso de vencimento (apenas saídas) ── */}
          {form.tipo === 'Saída' && (
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Aviso de vencimento
                </label>
                <button
                  type="button"
                  onClick={() => set('notificar', !form.notificar)}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0
                    ${form.notificar ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-600'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
                    ${form.notificar ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              {form.notificar && (
                <div className="mt-3 flex items-center gap-3 bg-slate-50 dark:bg-slate-700 rounded-xl px-4 py-3">
                  <span className="text-sm text-slate-600 dark:text-slate-300 flex-1">Avisar</span>
                  <div className="flex items-center gap-2">
                    <button type="button"
                      onClick={() => set('dias_aviso', Math.max(1, form.dias_aviso - 1))}
                      className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600">
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-slate-800 dark:text-slate-100">
                      {form.dias_aviso}
                    </span>
                    <button type="button"
                      onClick={() => set('dias_aviso', Math.min(30, form.dias_aviso + 1))}
                      className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600">
                      +
                    </button>
                  </div>
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {form.dias_aviso === 1 ? 'dia antes' : 'dias antes'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Repetição (apenas criação) ── */}
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Repetição</label>

              <div className="flex bg-slate-100 dark:bg-slate-700 rounded-xl p-1 gap-1 mb-3">
                <button type="button" onClick={() => set('repeticao', 'unico')}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all
                    ${form.repeticao === 'unico' ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
                  Único
                </button>
                <button type="button" onClick={() => set('repeticao', 'recorrente')}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all
                    ${form.repeticao === 'recorrente' ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
                  🔄 Recorrente
                </button>
                {form.tipo === 'Saída' && (
                  <button type="button" onClick={() => set('repeticao', 'parcelado')}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all
                      ${form.repeticao === 'parcelado' ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
                    💳 Parcelado
                  </button>
                )}
              </div>

              {form.repeticao !== 'unico' && (
                <>
                  {form.repeticao === 'recorrente' && (
                    <button
                      type="button"
                      onClick={() => set('infinito', !form.infinito)}
                      className={`w-full mb-3 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2
                        ${form.infinito
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      <span className="text-base">∞</span>
                      {form.infinito ? 'Sem prazo definido (ativo)' : 'Sem prazo definido'}
                    </button>
                  )}

                  <MesesStepper
                    value={form.meses}
                    onChange={v => set('meses', v)}
                    disabled={form.infinito}
                  />

                  {form.valor > 0 && (
                    <div className={`mt-3 rounded-xl px-4 py-3 border
                      ${form.repeticao === 'recorrente'
                        ? 'bg-success/5 border-success/20'
                        : 'bg-primary/5 border-primary/20'}`}
                    >
                      {form.repeticao === 'recorrente' ? (
                        <>
                          <p className="text-success text-sm font-medium">
                            {formatCurrency(form.valor)} / mês
                            {form.infinito ? ' · sem prazo definido' : ` por ${form.meses} meses`}
                          </p>
                          <p className="text-success/60 text-xs mt-0.5">
                            {form.infinito
                              ? `${MESES_INFINITO} registros criados (~10 anos)`
                              : `Total: ${formatCurrency(totalGeral)}`}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-primary text-sm font-medium">
                            {formatCurrency(valorUnitario)} / mês por {form.meses} meses
                          </p>
                          <p className="text-primary/60 text-xs mt-0.5">
                            Total: {formatCurrency(totalGeral)}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Botão salvar ── */}
          <button type="button" onClick={handleSave} disabled={saving}
            className="w-full bg-primary text-white py-4 rounded-xl font-semibold text-sm
              hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
            {saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Salvar registro'}
          </button>
          {/* Espaço extra pra não colar na bottom nav */}
          <div className="h-16" />
        </div>
        </>
        )}
      </div>
    </>
  )
}
