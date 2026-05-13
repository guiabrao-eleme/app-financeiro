import { useEffect, useState } from 'react'

/**
 * Bottom sheet para escolher o escopo de uma edição/exclusão recorrente.
 * Props:
 *   open        – boolean
 *   onClose     – () => void
 *   onSelect    – (scope: 'apenas_este' | 'este_e_proximos') => void
 *   action      – 'editar' | 'excluir'
 *   descricao   – string (nome do registro, exibido como contexto)
 */
export default function RecorrenciaEscopoSheet({
  open,
  onClose,
  onSelect,
  action = 'editar',
  descricao = '',
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) setTimeout(() => setVisible(true), 10)
    else setVisible(false)
  }, [open])

  if (!open) return null

  const isDelete = action === 'excluir'

  const pick = (scope) => {
    setVisible(false)
    setTimeout(() => onSelect(scope), 260)
  }

  const close = () => {
    setVisible(false)
    setTimeout(onClose, 260)
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-50 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={close}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-xl z-50 bg-white dark:bg-slate-800 rounded-t-3xl shadow-2xl
          transition-transform duration-300 ease-out`}
        style={{ transform: visible ? 'translate(-50%, 0)' : 'translate(-50%, 100%)' }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-200 dark:bg-slate-600 rounded-full" />
        </div>

        <div className="px-5 py-4 pb-safe-or-8">
          {/* Cabeçalho */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl mx-auto mb-3">
              🔄
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Registro recorrente</h3>
            {descricao && (
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 truncate px-4">"{descricao}"</p>
            )}
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              {isDelete ? 'O que deseja excluir?' : 'O que deseja editar?'}
            </p>
          </div>

          {/* Opções */}
          <div className="space-y-3 mb-4">
            {/* Apenas este */}
            <button
              onClick={() => pick('apenas_este')}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-700
                hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.98] transition-all text-left"
            >
              <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xl flex-shrink-0">
                📌
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Apenas este</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {isDelete
                    ? 'Remove somente este registro'
                    : 'Altera somente este mês'}
                </p>
              </div>
            </button>

            {/* Este e os próximos */}
            <button
              onClick={() => pick('este_e_proximos')}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 active:scale-[0.98] transition-all text-left
                ${isDelete
                  ? 'border-danger/20 hover:border-danger/40 hover:bg-red-50'
                  : 'border-primary/20 hover:border-primary/40 hover:bg-primary/5'}`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0
                ${isDelete ? 'bg-danger/10' : 'bg-primary/10'}`}
              >
                📅
              </div>
              <div>
                <p className={`text-sm font-semibold ${isDelete ? 'text-danger' : 'text-primary'}`}>
                  Este e os próximos
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {isDelete
                    ? 'Remove este e todos os registros futuros do grupo'
                    : 'Altera este e todos os registros futuros do grupo'}
                </p>
              </div>
            </button>
          </div>

          <button
            onClick={close}
            className="w-full py-3 rounded-xl text-slate-400 dark:text-slate-500 text-sm font-medium hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </>
  )
}
