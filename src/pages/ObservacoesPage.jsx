import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── Paleta de cores dos cards ────────────────────────────────────────────────
export const CORES = [
  { id: 'amarelo', label: 'Amarelo', dot: 'bg-yellow-400',  header: 'bg-yellow-200',  body: 'bg-yellow-50',   border: 'border-yellow-200',  title: 'text-yellow-900',  text: 'text-yellow-800' },
  { id: 'azul',    label: 'Azul',    dot: 'bg-blue-400',    header: 'bg-blue-200',    body: 'bg-blue-50',     border: 'border-blue-200',    title: 'text-blue-900',    text: 'text-blue-800' },
  { id: 'verde',   label: 'Verde',   dot: 'bg-green-400',   header: 'bg-green-200',   body: 'bg-green-50',    border: 'border-green-200',   title: 'text-green-900',   text: 'text-green-800' },
  { id: 'rosa',    label: 'Rosa',    dot: 'bg-pink-400',    header: 'bg-pink-200',    body: 'bg-pink-50',     border: 'border-pink-200',    title: 'text-pink-900',    text: 'text-pink-800' },
  { id: 'roxo',    label: 'Roxo',    dot: 'bg-purple-400',  header: 'bg-purple-200',  body: 'bg-purple-50',   border: 'border-purple-200',  title: 'text-purple-900',  text: 'text-purple-800' },
  { id: 'laranja', label: 'Laranja', dot: 'bg-orange-400',  header: 'bg-orange-200',  body: 'bg-orange-50',   border: 'border-orange-200',  title: 'text-orange-900',  text: 'text-orange-800' },
  { id: 'cinza',   label: 'Cinza',   dot: 'bg-slate-400',   header: 'bg-slate-200',   body: 'bg-slate-50',    border: 'border-slate-200',   title: 'text-slate-900',   text: 'text-slate-700' },
  { id: 'vermelho',label: 'Vermelho',dot: 'bg-red-400',     header: 'bg-red-200',     body: 'bg-red-50',      border: 'border-red-200',     title: 'text-red-900',     text: 'text-red-800' },
]

const getCor = (id) => CORES.find(c => c.id === id) ?? CORES[0]

// ─── Modal de criar / editar card ────────────────────────────────────────────
function CardModal({ open, onClose, onSaved, onDeleted, editCard = null }) {
  const [visible, setVisible] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [conteudo, setConteudo] = useState('')
  const [cor, setCor] = useState('amarelo')
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef(null)

  const isEdit = !!editCard

  useEffect(() => {
    if (open) {
      setTitulo(editCard?.titulo ?? '')
      setConteudo(editCard?.conteudo ?? '')
      setCor(editCard?.cor ?? 'amarelo')
      setTimeout(() => setVisible(true), 10)
    } else {
      setVisible(false)
    }
  }, [open, editCard])

  // Scroll lock iOS
  useEffect(() => {
    if (open) {
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
    } else {
      const scrollY = parseInt(document.body.style.top || '0') * -1
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      window.scrollTo(0, scrollY)
    }
    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
    }
  }, [open])

  if (!open) return null

  const corMeta = getCor(cor)

  const close = () => {
    setVisible(false)
    setTimeout(onClose, 280)
  }

  const handleSave = async () => {
    if (!titulo.trim()) {
      textareaRef.current?.focus()
      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        await supabase
          .from('observacoes')
          .update({ titulo: titulo.trim(), conteudo, cor, updated_at: new Date().toISOString() })
          .eq('id', editCard.id)
      } else {
        await supabase
          .from('observacoes')
          .insert({ titulo: titulo.trim(), conteudo, cor })
      }
      onSaved()
      close()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editCard) return
    setSaving(true)
    await supabase.from('observacoes').delete().eq('id', editCard.id)
    onDeleted()
    close()
    setSaving(false)
  }

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={close}
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl
          transition-transform duration-300 ease-out max-h-[92vh] flex flex-col
          ${visible ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Cabeçalho colorido */}
        <div className={`${corMeta.header} px-5 py-4 flex-shrink-0`}>
          <div className="flex items-center gap-3 mb-3">
            {/* Paleta de cores */}
            <div className="flex gap-2 flex-wrap">
              {CORES.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCor(c.id)}
                  className={`w-7 h-7 rounded-full ${c.dot} transition-all
                    ${cor === c.id ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'opacity-70 hover:opacity-100'}`}
                  title={c.label}
                />
              ))}
            </div>
            <div className="flex-1" />
            <button onClick={close} className="w-7 h-7 rounded-full bg-black/10 flex items-center justify-center text-sm text-slate-700">
              ✕
            </button>
          </div>

          {/* Título */}
          <input
            type="text"
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            placeholder="Título da nota..."
            maxLength={80}
            className={`w-full bg-transparent text-lg font-bold ${corMeta.title} placeholder-current/40 outline-none border-none`}
          />
        </div>

        {/* Conteúdo */}
        <div className={`flex-1 overflow-y-auto ${corMeta.body}`}>
          <textarea
            ref={textareaRef}
            value={conteudo}
            onChange={e => setConteudo(e.target.value)}
            placeholder="Escreva o que quiser aqui..."
            className={`w-full h-full min-h-[200px] px-5 py-4 bg-transparent ${corMeta.text}
              placeholder-current/30 outline-none resize-none text-sm leading-relaxed`}
          />
        </div>

        {/* Rodapé com botões */}
        <div className="px-5 py-4 pb-safe-or-6 bg-white border-t border-slate-100 flex gap-3 flex-shrink-0">
          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 text-danger text-sm font-semibold disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Excluir
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !titulo.trim()}
            className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50 active:scale-95 transition-all"
          >
            {saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar nota'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Card individual ──────────────────────────────────────────────────────────
function NoteCard({ card, onClick }) {
  const corMeta = getCor(card.cor)
  const preview = card.conteudo?.slice(0, 200) ?? ''

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl border ${corMeta.border} overflow-hidden
        active:scale-[0.97] transition-transform shadow-sm`}
    >
      {/* Header colorido */}
      <div className={`${corMeta.header} px-3 py-2.5`}>
        <p className={`text-sm font-bold ${corMeta.title} leading-tight line-clamp-2`}>
          {card.titulo}
        </p>
      </div>

      {/* Corpo */}
      {preview && (
        <div className={`${corMeta.body} px-3 py-2.5`}>
          <p className={`text-xs ${corMeta.text} leading-relaxed line-clamp-6 whitespace-pre-wrap`}>
            {preview}
          </p>
        </div>
      )}
    </button>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function ObservacoesPage() {
  const { user } = useAuth()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editCard, setEditCard] = useState(null)

  const fetchNotes = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('observacoes')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (!error) setNotes(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchNotes() }, [user.id])

  const openCreate = () => {
    setEditCard(null)
    setModalOpen(true)
  }

  const openEdit = (card) => {
    setEditCard(card)
    setModalOpen(true)
  }

  // Distribui cards em 2 colunas (esquerda / direita) de forma equilibrada
  const col1 = notes.filter((_, i) => i % 2 === 0)
  const col2 = notes.filter((_, i) => i % 2 === 1)

  return (
    <div className="min-h-screen bg-background flex flex-col page-enter">

      {/* Header */}
      <div className="bg-primary text-white px-4 pt-safe pb-4 shadow-md flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Observações</h1>
            <p className="text-white/60 text-xs mt-0.5">
              {notes.length === 0 ? 'Nenhuma nota ainda' : `${notes.length} ${notes.length === 1 ? 'nota' : 'notas'}`}
            </p>
          </div>
          <button
            onClick={openCreate}
            className="w-9 h-9 bg-white/15 hover:bg-white/25 rounded-xl flex items-center justify-center text-xl font-light transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto pb-32">
        {loading ? (
          // Skeleton
          <div className="px-4 pt-4 grid grid-cols-2 gap-3">
            {[140, 100, 180, 120, 90, 160].map((h, i) => (
              <div key={i} className="rounded-2xl bg-slate-100 animate-pulse" style={{ height: h }} />
            ))}
          </div>
        ) : notes.length === 0 ? (
          // Estado vazio
          <div className="flex flex-col items-center justify-center py-20 text-center px-8">
            <div className="w-20 h-20 rounded-3xl bg-yellow-100 flex items-center justify-center text-4xl mb-5">
              📝
            </div>
            <p className="text-slate-700 font-bold text-lg">Nenhuma nota ainda</p>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              Crie notas coloridas para guardar lembretes, observações ou qualquer coisa importante.
            </p>
            <button
              onClick={openCreate}
              className="mt-6 bg-primary text-white px-6 py-3 rounded-xl font-semibold text-sm active:scale-95 transition-all"
            >
              + Criar primeira nota
            </button>
          </div>
        ) : (
          // Grid de 2 colunas
          <div className="px-4 pt-4 flex gap-3 items-start">
            {/* Coluna 1 */}
            <div className="flex-1 flex flex-col gap-3">
              {col1.map(card => (
                <NoteCard key={card.id} card={card} onClick={() => openEdit(card)} />
              ))}
            </div>
            {/* Coluna 2 */}
            <div className="flex-1 flex flex-col gap-3">
              {col2.map(card => (
                <NoteCard key={card.id} card={card} onClick={() => openEdit(card)} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <CardModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={fetchNotes}
        onDeleted={fetchNotes}
        editCard={editCard}
      />
    </div>
  )
}
