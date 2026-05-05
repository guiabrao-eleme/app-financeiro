import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export const COR_MAP = {
  slate:  { bg: 'bg-slate-100 dark:bg-slate-700',        text: 'text-slate-600 dark:text-slate-300',     dot: 'bg-slate-400' },
  blue:   { bg: 'bg-blue-100 dark:bg-blue-900/30',       text: 'text-blue-700 dark:text-blue-300',       dot: 'bg-blue-500' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-900/30',   text: 'text-purple-700 dark:text-purple-300',   dot: 'bg-purple-500' },
  green:  { bg: 'bg-green-100 dark:bg-green-900/30',     text: 'text-green-700 dark:text-green-300',     dot: 'bg-green-500' },
  pink:   { bg: 'bg-pink-100 dark:bg-pink-900/30',       text: 'text-pink-700 dark:text-pink-300',       dot: 'bg-pink-500' },
  orange: { bg: 'bg-orange-100 dark:bg-orange-900/30',   text: 'text-orange-700 dark:text-orange-300',   dot: 'bg-orange-500' },
  red:    { bg: 'bg-red-100 dark:bg-red-900/30',         text: 'text-red-700 dark:text-red-300',         dot: 'bg-red-500' },
  yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/30',   text: 'text-yellow-700 dark:text-yellow-300',   dot: 'bg-yellow-400' },
}

export const getCorMeta = (cor) => COR_MAP[cor] ?? COR_MAP.slate

export function useCartoes() {
  const { user } = useAuth()
  const [cartoes, setCartoes] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchCartoes = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('cartoes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    setCartoes(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchCartoes() }, [fetchCartoes])

  const createCartao = async ({ nome, icone, cor }) => {
    const { data, error } = await supabase
      .from('cartoes')
      .insert({ user_id: user.id, nome: nome.trim(), icone, cor })
      .select()
      .single()
    if (!error && data) setCartoes(prev => [...prev, data])
    return { data, error }
  }

  const deleteCartao = async (id) => {
    const { error } = await supabase.from('cartoes').delete().eq('id', id)
    if (!error) setCartoes(prev => prev.filter(c => c.id !== id))
    return { error }
  }

  return { cartoes, loading, createCartao, deleteCartao, refetch: fetchCartoes }
}
