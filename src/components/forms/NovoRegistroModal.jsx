import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { formatCurrency } from '../../utils/format'
import { useToast } from '../ui/Toast'
import CurrencyInput from './CurrencyInput'
import { useCategories } from '../../hooks/useCategories'

const EMOJIS_SUGERIDOS = [
  '🏠','🚗','🎓','🛍️','💰','📚','💼','🍀','🍕','✈️',
  '🏥','💊','🎮','🎬','🐕','🎂','💄','👗','👟','💻',
  '📱','🎵','🌮','🍔','🛒','⚽','🎁','💡','🔧','🎯',
  '🏋️','🌟','☕','🍷','🏖️','📦','💸','🎪','🎨','🔑',
]

const todayStr = () => new Date().toISOString().split('T')[0]

const addMonths = (dateStr, months) => {
  const d = new Date(dateStr + 'T12:00:00')
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0]
}

// 10 anos como limite prático para "sem prazo"
const MESES_INFINITO = 120

const EMPTY_FORM = {
  data: todayStr(),
  descricao: '',
  tipo: 'Saída',
  categoria: '',
  valor: 0,
  repeticao: 'unico',   // 'unico' | 'recorrente' | 'parcelado'
  meses: 12,
  infinito: false,       // true = sem prazo definido (120 meses)
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
    <div className="mt-3 bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nova categoria</p>

      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
        {EMOJIS_SUGERIDOS.map(e => (
          <button
            key={e} type="button" onClick={() => setIcone(e)}
            className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all
              ${icone === e ? 'bg-primary/15 ring-2 ring-primary scale-110' : 'bg-white border border-slate-200 hover:bg-slate-100'}`}
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
          className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
        />
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium">
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

// ─── Stepper de meses com input direto ───────────────────────────────────────
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
        className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-lg text-slate-600 hover:bg-slate-50 active:scale-95 transition-all">
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
            className="w-20 text-center text-2xl font-bold text-slate-800 outline-none bg-transparent border-b-2 border-primary"
          />
        ) : (
          <span className="text-2xl font-bold text-slate-800 cursor-pointer border-b-2 border-transparent hover:border-slate-300 transition-all">
            {value}
          </span>
        )}
        <span className="text-slate-400 text-sm ml-1">meses</span>
      </div>

      <button type="button"
        onClick={() => onChange(Math.min(600, value + 1))}
        className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-lg text-slate-600 hover:bg-slate-50 active:scale-95 transition-all">
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
  const isEdit = !!editItem

  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [visible, setVisible] = useState(false)
  const [creating, setCreating] = useState(false)

  // Scroll lock iOS
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
        valor: Number(editItem.valor),
        repeticao: 'unico',
        meses: 12,
        infinito: false,
      })
    } else {
      setForm({ ...EMPTY_FORM, data: todayStr() })
    }
    setErrors({})
    setCreating(false)
  }, [open, isEdit, editItem])

  if (!open) return null

  const catsParaTipo = categories.filter(c => c.tipo === form.tipo || c.tipo === 'Ambos')

  const validate = () => {
    const errs = {}
    if (!form.data) errs.data = 'Data obrigatória'
    if (!form.descricao.trim()) errs.descricao = 'Descrição obrigatória'
    if (!form.categoria) errs.categoria = 'Selecione uma categoria'
    if (!form.valor || form.valor <= 0) errs.valor = 'Informe um valor válido'
    return errs
  }

  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSaving(true)
    try {
      if (isEdit) {
        // ── Modo edição ───────────────────────────────────────────────────────
        if (editEscopo === 'este_e_proximos' && editItem.grupo_recorrente) {
          const { error: bulkError } = await supabase
            .from('lancamentos')
            .update({
              descricao: form.descricao.trim(),
              tipo: form.tipo,
              categoria: form.categoria,
              valor: form.valor,
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
              valor: form.valor,
            })
            .eq('id', editItem.id)
          if (error) throw error
          addToast('Registro atualizado!', 'success')
        }
      } else {
        // ── Modo criação ──────────────────────────────────────────────────────
        const isRepetindo = form.repeticao !== 'unico'
        const n = isRepetindo
          ? (form.infinito ? MESES_INFINITO : form.meses)
          : 1
        const isParcelado = form.repeticao === 'parcelado'
        const valorUnitario = isParcelado
          ? parseFloat((form.valor / n).toFixed(2))
          : form.valor

        // Gera UUID de grupo apenas para registros repetidos
        let grupoId = null
        if (isRepetindo) {
          grupoId = typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2) + Date.now().toString(36)
        }

        // Monta registros — só inclui colunas opcionais quando têm valor
        // (evita erros caso migrações SQL ainda não tenham sido executadas)
        const registros = Array.from({ length: n }, (_, i) => {
          const rec = {
            user_id: user.id,
            data_vencimento: addMonths(form.data, i),
            descricao: form.descricao.trim(),
            tipo: form.tipo,
            categoria: form.categoria,
            valor: valorUnitario,
          }
          if (n > 1) {
            rec.parcela_atual = i + 1
            rec.total_parcelas = n
          }
          if (grupoId) {
            rec.grupo_recorrente = grupoId
            rec.tipo_repeticao = form.repeticao
          }
          return rec
        })

        const { error } = await supabase.from('lancamentos').insert(registros)
        if (error) throw error

        const msg = isParcelado
          ? `${n} parcelas de ${formatCurrency(valorUnitario)} criadas!`
          : n > 1
            ? form.infinito
              ? `${n} meses recorrentes criados (sem prazo)!`
              : `${n} meses recorrentes criados!`
            : 'Registro salvo!'
        addToast(msg, 'success')
      }
      setTimeout(() => { onSaved(); handleClose() }, 1000)
    } catch (err) {
      console.error('Erro ao salvar:', err)
      addToast('Erro ao salvar. Tente novamente.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setVisible(false)
    setCreating(false)
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

  // Número real de meses usado no resumo
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
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl
          transition-transform duration-300 ease-out max-h-[92vh] overflow-y-auto
          ${visible ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              {isEdit ? 'Editar Registro' : 'Novo Registro'}
            </h2>
            {showEscopoBadge && (
              <p className={`text-xs mt-0.5 font-medium ${editEscopo === 'este_e_proximos' ? 'text-primary' : 'text-slate-400'}`}>
                {editEscopo === 'este_e_proximos' ? '📅 Editando este e os próximos' : '📌 Editando apenas este'}
              </p>
            )}
          </div>
          <button onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-5 pb-10">

          {/* ── Tipo ── */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tipo</label>
            <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
              {['Entrada', 'Saída'].map(tipo => (
                <button key={tipo} type="button"
                  onClick={() => { set('tipo', tipo); set('categoria', ''); set('repeticao', 'unico') }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all
                    ${form.tipo === tipo
                      ? tipo === 'Entrada' ? 'bg-success text-white shadow-sm' : 'bg-danger text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {tipo === 'Entrada' ? '↑ Entrada' : '↓ Saída'}
                </button>
              ))}
            </div>
          </div>

          {/* ── Data ── */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {isEdit ? 'Data de vencimento' : 'Data'}
            </label>
            <div className="flex gap-2">
              <input type="date" value={form.data} onChange={e => set('data', e.target.value)}
                className={`flex-1 px-4 py-3 rounded-xl border text-sm outline-none transition-all
                  ${errors.data ? 'border-danger bg-red-50' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10'}`}
              />
              {!isEdit && (
                <button type="button" onClick={() => set('data', todayStr())}
                  className="px-4 py-3 rounded-xl border border-slate-200 text-sm text-primary font-medium hover:bg-primary/5 whitespace-nowrap">
                  Hoje
                </button>
              )}
            </div>
            {errors.data && <p className="text-danger text-xs mt-1">{errors.data}</p>}
          </div>

          {/* ── Descrição ── */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Descrição</label>
            <input type="text" value={form.descricao} onChange={e => set('descricao', e.target.value)}
              placeholder="Ex: Mercado, Salário, Conta de luz..."
              className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all
                ${errors.descricao ? 'border-danger bg-red-50' : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10'}`}
            />
            {errors.descricao && <p className="text-danger text-xs mt-1">{errors.descricao}</p>}
          </div>

          {/* ── Categoria ── */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Categoria</label>

            {catsLoading ? (
              <div className="h-16 flex items-center justify-center text-slate-400 text-sm">Carregando...</div>
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
                            ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
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
                    className="flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-primary hover:text-primary transition-all">
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
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {form.repeticao === 'parcelado' ? 'Valor total' : 'Valor'}
            </label>
            <CurrencyInput value={form.valor} onChange={val => set('valor', val)} error={errors.valor} />
            {errors.valor && <p className="text-danger text-xs mt-1">{errors.valor}</p>}
          </div>

          {/* ── Repetição (apenas criação) ── */}
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Repetição</label>

              {/* Toggle de modo */}
              <div className="flex bg-slate-100 rounded-xl p-1 gap-1 mb-3">
                <button type="button" onClick={() => set('repeticao', 'unico')}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all
                    ${form.repeticao === 'unico' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
                  Único
                </button>
                <button type="button" onClick={() => set('repeticao', 'recorrente')}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all
                    ${form.repeticao === 'recorrente' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
                  🔄 Recorrente
                </button>
                {form.tipo === 'Saída' && (
                  <button type="button" onClick={() => set('repeticao', 'parcelado')}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all
                      ${form.repeticao === 'parcelado' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
                    💳 Parcelado
                  </button>
                )}
              </div>

              {/* Stepper de meses + toggle infinito */}
              {form.repeticao !== 'unico' && (
                <>
                  {/* Toggle "Sem prazo" — só para recorrente */}
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

                  {/* Stepper — desabilitado quando infinito */}
                  <MesesStepper
                    value={form.meses}
                    onChange={v => set('meses', v)}
                    disabled={form.infinito}
                  />

                  {/* Resumo */}
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
                            {form.infinito
                              ? ' · sem prazo definido'
                              : ` por ${form.meses} meses`}
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
        </div>
      </div>
    </>
  )
}
