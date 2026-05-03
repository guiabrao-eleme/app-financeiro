import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { formatCurrency } from '../../utils/format'
import { useToast } from '../ui/Toast'
import CurrencyInput from './CurrencyInput'

const CATEGORIAS = [
  { id: 'Casa',       icon: '🏠' },
  { id: 'Carro',      icon: '🚗' },
  { id: 'Faculdade',  icon: '🎓' },
  { id: 'Saídas',     icon: '🛍️' },
  { id: 'Outros',     icon: '📦' },
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
  parcelas: 1,
}

// editItem: objeto lancamento existente (modo edição) ou null (modo criação)
export default function NovoRegistroModal({ open, onClose, onSaved, editItem = null }) {
  const { user } = useAuth()
  const { addToast, ToastContainer } = useToast()
  const isEdit = !!editItem

  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [visible, setVisible] = useState(false)

  // Animação de entrada/saída
  useEffect(() => {
    if (open) setTimeout(() => setVisible(true), 10)
    else setVisible(false)
  }, [open])

  // Inicializa form ao abrir
  useEffect(() => {
    if (!open) return
    if (isEdit) {
      setForm({
        data: editItem.data_vencimento,
        descricao: editItem.descricao,
        tipo: editItem.tipo,
        categoria: editItem.categoria,
        valor: Number(editItem.valor),
        parcelas: 1,
      })
    } else {
      setForm({ ...EMPTY_FORM, data: todayStr() })
    }
    setErrors({})
  }, [open, isEdit, editItem])

  if (!open) return null

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
        // Modo edição: UPDATE no registro existente
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
        addToast('Registro atualizado com sucesso!', 'success')
      } else {
        // Modo criação: INSERT (com suporte a parcelas)
        const parcelas = form.tipo === 'Saída' ? form.parcelas : 1
        const valorParcela = parseFloat((form.valor / parcelas).toFixed(2))

        const registros = Array.from({ length: parcelas }, (_, i) => ({
          user_id: user.id,
          data_registro: form.data,
          data_vencimento: addMonths(form.data, i),
          descricao: form.descricao.trim(),
          tipo: form.tipo,
          categoria: form.categoria,
          valor: valorParcela,
          parcela_atual: i + 1,
          total_parcelas: parcelas,
          valor_total: form.valor,
        }))

        const { error } = await supabase.from('lancamentos').insert(registros)
        if (error) throw error

        addToast(
          parcelas > 1
            ? `${parcelas} parcelas registradas com sucesso!`
            : 'Registro salvo com sucesso!',
          'success'
        )
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
    setTimeout(onClose, 280)
  }

  const set = (field, val) => {
    setForm(prev => ({ ...prev, [field]: val }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const valorParcela = form.parcelas > 1 ? form.valor / form.parcelas : 0

  return (
    <>
      <ToastContainer />
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Bottom sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl
          transition-transform duration-300 ease-out max-h-[92vh] overflow-y-auto
          ${visible ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              {isEdit ? 'Editar Registro' : 'Novo Registro'}
            </h2>
            {isEdit && editItem.total_parcelas > 1 && (
              <p className="text-xs text-slate-400 mt-0.5">
                Parcela {editItem.parcela_atual}/{editItem.total_parcelas} — editando apenas esta
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-5 pb-8">

          {/* Toggle Tipo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tipo</label>
            <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
              {['Entrada', 'Saída'].map(tipo => (
                <button
                  key={tipo}
                  onClick={() => { set('tipo', tipo); set('parcelas', 1) }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all
                    ${form.tipo === tipo
                      ? tipo === 'Entrada'
                        ? 'bg-success text-white shadow-sm'
                        : 'bg-danger text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {tipo === 'Entrada' ? '↑ Entrada' : '↓ Saída'}
                </button>
              ))}
            </div>
          </div>

          {/* Data */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {isEdit ? 'Data de vencimento' : 'Data'}
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={form.data}
                onChange={e => set('data', e.target.value)}
                className={`flex-1 px-4 py-3 rounded-xl border text-sm outline-none transition-all
                  ${errors.data
                    ? 'border-danger bg-red-50'
                    : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10'}`}
              />
              {!isEdit && (
                <button
                  onClick={() => set('data', todayStr())}
                  className="px-4 py-3 rounded-xl border border-slate-200 text-sm text-primary font-medium hover:bg-primary/5 transition-colors whitespace-nowrap"
                >
                  Hoje
                </button>
              )}
            </div>
            {errors.data && <p className="text-danger text-xs mt-1">{errors.data}</p>}
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Descrição</label>
            <input
              type="text"
              value={form.descricao}
              onChange={e => set('descricao', e.target.value)}
              placeholder="Ex: Mercado, Salário, Conta de luz..."
              className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all
                ${errors.descricao
                  ? 'border-danger bg-red-50'
                  : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10'}`}
            />
            {errors.descricao && <p className="text-danger text-xs mt-1">{errors.descricao}</p>}
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Categoria</label>
            <div className="grid grid-cols-5 gap-2">
              {CATEGORIAS.map(({ id, icon }) => (
                <button
                  key={id}
                  onClick={() => set('categoria', id)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-medium transition-all
                    ${form.categoria === id
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                >
                  <span className="text-xl">{icon}</span>
                  <span className="text-[10px] leading-tight">{id}</span>
                </button>
              ))}
            </div>
            {errors.categoria && <p className="text-danger text-xs mt-1">{errors.categoria}</p>}
          </div>

          {/* Valor */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {!isEdit && form.tipo === 'Saída' && form.parcelas > 1 ? 'Valor total' : 'Valor'}
            </label>
            <CurrencyInput
              value={form.valor}
              onChange={val => set('valor', val)}
              error={errors.valor}
            />
            {errors.valor && <p className="text-danger text-xs mt-1">{errors.valor}</p>}
          </div>

          {/* Parcelas — apenas criação de Saída */}
          {!isEdit && form.tipo === 'Saída' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Parcelas</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => set('parcelas', Math.max(1, form.parcelas - 1))}
                  className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-lg text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
                >
                  −
                </button>
                <div className="flex-1 text-center">
                  <span className="text-2xl font-bold text-slate-800">{form.parcelas}</span>
                  <span className="text-slate-400 text-sm ml-1">× de 48</span>
                </div>
                <button
                  onClick={() => set('parcelas', Math.min(48, form.parcelas + 1))}
                  className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-lg text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
                >
                  +
                </button>
              </div>

              {form.parcelas > 1 && form.valor > 0 && (
                <div className="mt-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
                  <p className="text-primary text-sm font-medium">
                    {formatCurrency(valorParcela)} por mês durante {form.parcelas} meses
                  </p>
                  <p className="text-primary/60 text-xs mt-0.5">
                    Total: {formatCurrency(form.valor)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Botão salvar */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-primary text-white py-4 rounded-xl font-semibold text-sm
              hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving
              ? (isEdit ? 'Salvando...' : 'Salvando...')
              : (isEdit ? 'Salvar alterações' : 'Salvar registro')}
          </button>
        </div>
      </div>
    </>
  )
}
