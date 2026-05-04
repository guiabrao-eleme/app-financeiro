import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { formatCurrency } from '../../utils/format'
import { useToast } from '../ui/Toast'
import CurrencyInput from './CurrencyInput'
import { useCategories, CAT_COLORS } from '../../hooks/useCategories'

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

const EMPTY_FORM = {
  data: todayStr(),
  descricao: '',
  tipo: 'Saída',
  categoria: '',
  valor: 0,
  repeticao: 'unico',   // 'unico' | 'recorrente' | 'parcelado'
  meses: 2,
}

// ─── Formulário de nova categoria ────────────────────────────────────────────
// createCategory vem do pai — ambos compartilham a mesma instância do hook
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

// ─── Modal principal ──────────────────────────────────────────────────────────
/**
 * editEscopo: 'apenas_este' | 'este_e_proximos'
 *   — vem do RegistrosPage após o usuário escolher o escopo no RecorrenciaEscopoSheet
 *   — só é relevante quando editItem.grupo_recorrente está definido
 */
export default function NovoRegistroModal({
  open,
  onClose,
  onSaved,
  editItem = null,
  editEscopo = 'apenas_este',
}) {
  const { user } = useAuth()
  const { addToast, ToastContainer } = useToast()
  // Uma única instância do hook — compartilhada com NewCategoryForm via prop
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
        meses: 2,
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
          // 1. Atualiza campos comuns em todos os registros futuros do grupo
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

          // 2. Atualiza a data apenas neste registro específico
          const { error: dateError } = await supabase
            .from('lancamentos')
            .update({ data_vencimento: form.data })
            .eq('id', editItem.id)

          if (dateError) throw dateError

          addToast('Registros futuros atualizados!', 'success')
        } else {
          // apenas_este (ou registro sem grupo): atualiza só este
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
        const n = isRepetindo ? form.meses : 1
        const isParcelado = form.repeticao === 'parcelado'
        const valorUnitario = isParcelado
          ? parseFloat((form.valor / n).toFixed(2))
          : form.valor

        // Gera um UUID de grupo para vincular todos os registros recorrentes/parcelados
        const grupoId = isRepetindo
          ? (crypto.randomUUID ? crypto.randomUUID() : self.crypto.randomUUID())
          : null

        const registros = Array.from({ length: n }, (_, i) => ({
          user_id: user.id,
          data_registro: form.data,
          data_vencimento: addMonths(form.data, i),
          descricao: form.descricao.trim(),
          tipo: form.tipo,
          categoria: form.categoria,
          valor: valorUnitario,
          parcela_atual: n > 1 ? i + 1 : null,
          total_parcelas: n > 1 ? n : null,
          valor_total: form.valor,
          grupo_recorrente: grupoId,
          tipo_repeticao: isRepetindo ? form.repeticao : null,
        }))

        const { error } = await supabase.from('lancamentos').insert(registros)
        if (error) throw error

        const msg = isParcelado
          ? `${n} parcelas de ${formatCurrency(valorUnitario)} criadas!`
          : n > 1
            ? `${n} meses recorrentes criados!`
            : 'Registro salvo!'
        addToast(msg, 'success')
      }
      setTimeout(() => { onSaved(); handleClose() }, 1000)
    } catch {
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

  // Resumo da repetição
  const valorUnitario = form.repeticao === 'parcelado' && form.meses > 1
    ? form.valor / form.meses : form.valor
  const totalGeral = form.repeticao !== 'unico'
    ? form.repeticao === 'parcelado' ? form.valor : form.valor * form.meses
    : form.valor

  // Badge de escopo para edição recorrente
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
            {/* Indicador de escopo */}
            {showEscopoBadge && (
              <p className={`text-xs mt-0.5 font-medium
                ${editEscopo === 'este_e_proximos' ? 'text-primary' : 'text-slate-400'}`}>
                {editEscopo === 'este_e_proximos'
                  ? '📅 Editando este e os próximos'
                  : '📌 Editando apenas este'}
              </p>
            )}
            {isEdit && editItem.total_parcelas > 1 && editItem.tipo_repeticao !== 'recorrente' && !showEscopoBadge && (
              <p className="text-xs text-slate-400 mt-0.5">
                {editItem.parcela_atual}/{editItem.total_parcelas} — editando apenas esta
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
                createCategory={createCategory}  // ← mesma instância do pai
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

              {/* Stepper de meses */}
              {form.repeticao !== 'unico' && (
                <>
                  <div className="flex items-center gap-3">
                    <button type="button"
                      onClick={() => set('meses', Math.max(2, form.meses - 1))}
                      className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-lg text-slate-600 hover:bg-slate-50 active:scale-95 transition-all">
                      −
                    </button>
                    <div className="flex-1 text-center">
                      <span className="text-2xl font-bold text-slate-800">{form.meses}</span>
                      <span className="text-slate-400 text-sm ml-1">meses</span>
                    </div>
                    <button type="button"
                      onClick={() => set('meses', Math.min(60, form.meses + 1))}
                      className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-lg text-slate-600 hover:bg-slate-50 active:scale-95 transition-all">
                      +
                    </button>
                  </div>

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
                            {formatCurrency(form.valor)} / mês por {form.meses} meses
                          </p>
                          <p className="text-success/60 text-xs mt-0.5">
                            Total: {formatCurrency(totalGeral)}
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
