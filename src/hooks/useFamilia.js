import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useFamilia() {
  const { user } = useAuth()

  const [familia, setFamilia]               = useState(null)   // família atual
  const [membros, setMembros]               = useState([])     // membros da família
  const [convitePendente, setConvitePendente] = useState(null) // convite recebido
  const [lancamentos, setLancamentos]       = useState([])     // contas compartilhadas
  const [loading, setLoading]               = useState(true)

  // ── Carrega tudo ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)

    // 1. Verifica se já está em alguma família
    const { data: membro } = await supabase
      .from('familia_membros')
      .select('familia_id, role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (membro?.familia_id) {
      // Carrega info da família
      const { data: fam } = await supabase
        .from('familias')
        .select('*')
        .eq('id', membro.familia_id)
        .single()

      // Carrega membros
      const { data: mems } = await supabase
        .from('familia_membros')
        .select('*')
        .eq('familia_id', membro.familia_id)
        .order('joined_at', { ascending: true })

      setFamilia(fam ? { ...fam, meu_role: membro.role } : null)
      setMembros(mems ?? [])
      setConvitePendente(null)
    } else {
      // 2. Verifica convites pendentes pelo e-mail do usuário
      const { data: convite } = await supabase
        .from('familia_convites')
        .select('*')
        .eq('email', user.email)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      setFamilia(null)
      setMembros([])
      setConvitePendente(convite ?? null)
    }

    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  // ── Carrega lançamentos do mês ────────────────────────────────────────────
  const fetchLancamentos = useCallback(async (year, month) => {
    if (!familia) return
    const pad  = n => String(n).padStart(2, '0')
    const last = new Date(year, month, 0).getDate()
    const start = `${year}-${pad(month)}-01`
    const end   = `${year}-${pad(month)}-${pad(last)}`

    const { data } = await supabase
      .from('lancamentos_familia')
      .select('*')
      .eq('familia_id', familia.id)
      .gte('data_vencimento', start)
      .lte('data_vencimento', end)
      .order('data_vencimento', { ascending: true })

    setLancamentos(data ?? [])
  }, [familia])

  // ── Criar família ─────────────────────────────────────────────────────────
  const createFamilia = useCallback(async (nome) => {
    const { data: fam, error: e1 } = await supabase
      .from('familias')
      .insert({ nome: nome.trim(), criado_por: user.id })
      .select()
      .single()
    if (e1) return { error: e1.message }

    const { error: e2 } = await supabase
      .from('familia_membros')
      .insert({
        familia_id: fam.id,
        user_id:    user.id,
        email:      user.email,
        nome:       user.user_metadata?.full_name || user.email.split('@')[0],
        role:       'admin',
      })
    if (e2) return { error: e2.message }

    await load()
    return { error: null }
  }, [user, load])

  // ── Convidar membro ───────────────────────────────────────────────────────
  const convidarMembro = useCallback(async (email) => {
    if (!familia) return { error: 'Você não está em uma família.' }
    const emailNorm = email.toLowerCase().trim()
    if (emailNorm === user.email) return { error: 'Você já é membro desta família.' }

    // Verifica se já é membro
    const { data: jaEh } = await supabase
      .from('familia_membros')
      .select('id')
      .eq('familia_id', familia.id)
      .eq('email', emailNorm)
      .maybeSingle()
    if (jaEh) return { error: 'Este usuário já faz parte da família.' }

    const { error } = await supabase
      .from('familia_convites')
      .upsert({
        familia_id:          familia.id,
        familia_nome:        familia.nome,
        email:               emailNorm,
        convidado_por:       user.id,
        convidado_por_nome:  user.user_metadata?.full_name || user.email.split('@')[0],
        status:              'pendente',
      }, { onConflict: 'familia_id,email' })

    if (error) return { error: error.message }
    return { error: null }
  }, [familia, user])

  // ── Aceitar convite ───────────────────────────────────────────────────────
  const aceitarConvite = useCallback(async () => {
    if (!convitePendente) return { error: 'Nenhum convite pendente.' }

    const { error: e1 } = await supabase
      .from('familia_membros')
      .insert({
        familia_id: convitePendente.familia_id,
        user_id:    user.id,
        email:      user.email,
        nome:       user.user_metadata?.full_name || user.email.split('@')[0],
        role:       'membro',
      })
    if (e1) return { error: e1.message }

    await supabase
      .from('familia_convites')
      .update({ status: 'aceito' })
      .eq('id', convitePendente.id)

    await load()
    return { error: null }
  }, [convitePendente, user, load])

  // ── Recusar convite ───────────────────────────────────────────────────────
  const recusarConvite = useCallback(async () => {
    if (!convitePendente) return
    await supabase
      .from('familia_convites')
      .update({ status: 'recusado' })
      .eq('id', convitePendente.id)
    setConvitePendente(null)
  }, [convitePendente])

  // ── Sair da família ───────────────────────────────────────────────────────
  const sairDaFamilia = useCallback(async () => {
    if (!familia) return { error: 'Você não está em uma família.' }
    const { error } = await supabase
      .from('familia_membros')
      .delete()
      .eq('familia_id', familia.id)
      .eq('user_id', user.id)
    if (error) return { error: error.message }
    setFamilia(null)
    setMembros([])
    setLancamentos([])
    return { error: null }
  }, [familia, user])

  // ── Remover membro (admin) ────────────────────────────────────────────────
  const removerMembro = useCallback(async (membroUserId) => {
    if (!familia || familia.meu_role !== 'admin') return { error: 'Sem permissão.' }
    const { error } = await supabase
      .from('familia_membros')
      .delete()
      .eq('familia_id', familia.id)
      .eq('user_id', membroUserId)
    if (error) return { error: error.message }
    setMembros(prev => prev.filter(m => m.user_id !== membroUserId))
    return { error: null }
  }, [familia])

  // ── CRUD lançamentos ──────────────────────────────────────────────────────
  const addLancamento = useCallback(async (payload) => {
    if (!familia) return { error: 'Você não está em uma família.' }
    const { data, error } = await supabase
      .from('lancamentos_familia')
      .insert({
        ...payload,
        familia_id:     familia.id,
        criado_por:     user.id,
        criado_por_nome: user.user_metadata?.full_name || user.email.split('@')[0],
      })
      .select()
      .single()
    if (error) return { error: error.message }
    setLancamentos(prev => [...prev, data].sort((a,b) => a.data_vencimento.localeCompare(b.data_vencimento)))
    return { error: null }
  }, [familia, user])

  const updateLancamento = useCallback(async (id, payload) => {
    const { error } = await supabase
      .from('lancamentos_familia')
      .update(payload)
      .eq('id', id)
    if (error) return { error: error.message }
    setLancamentos(prev => prev.map(l => l.id === id ? { ...l, ...payload } : l))
    return { error: null }
  }, [])

  const deleteLancamento = useCallback(async (id) => {
    const { error } = await supabase
      .from('lancamentos_familia')
      .delete()
      .eq('id', id)
    if (error) return { error: error.message }
    setLancamentos(prev => prev.filter(l => l.id !== id))
    return { error: null }
  }, [])

  const togglePago = useCallback(async (id, pago) => {
    const pago_por_nome = pago
      ? (user.user_metadata?.full_name || user.email.split('@')[0])
      : null
    return updateLancamento(id, { pago, pago_por_nome })
  }, [user, updateLancamento])

  return {
    familia, membros, convitePendente, lancamentos, loading,
    fetchLancamentos,
    createFamilia, convidarMembro,
    aceitarConvite, recusarConvite,
    sairDaFamilia, removerMembro,
    addLancamento, updateLancamento, deleteLancamento, togglePago,
    refetch: load,
  }
}
