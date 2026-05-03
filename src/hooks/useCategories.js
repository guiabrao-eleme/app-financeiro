import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// Paleta de cores para as categorias (índice salvo no banco)
export const CAT_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-orange-100 text-orange-700',
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-amber-100 text-amber-700',
  'bg-green-100 text-green-700',
  'bg-rose-100 text-rose-700',
  'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700',
  'bg-cyan-100 text-cyan-700',
]

// Retorna { icon, color } para uma categoria pelo nome
export function getCatMeta(nome, categories) {
  const found = categories.find(c => c.nome === nome)
  if (found) {
    return {
      icon: found.icone,
      color: CAT_COLORS[found.cor % CAT_COLORS.length],
    }
  }
  return { icon: '📦', color: 'bg-slate-100 text-slate-600' }
}

export function useCategories() {
  const { user } = useAuth()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchCategories = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('categorias')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    setCategories(data ?? [])
    setLoading(false)
  }, [user?.id])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const createCategory = async ({ nome, icone, tipo }) => {
    const cor = categories.length % CAT_COLORS.length
    const { data, error } = await supabase
      .from('categorias')
      .insert({ user_id: user.id, nome: nome.trim(), icone, cor, tipo })
      .select()
      .single()
    if (!error && data) setCategories(prev => [...prev, data])
    return { data, error }
  }

  const deleteCategory = async (id) => {
    const { error } = await supabase.from('categorias').delete().eq('id', id)
    if (!error) setCategories(prev => prev.filter(c => c.id !== id))
    return { error }
  }

  return { categories, loading, createCategory, deleteCategory, refetch: fetchCategories }
}
