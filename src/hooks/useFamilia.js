import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useFamilia() {
  const { user } = useAuth()

  const [familias, setFamilias]               = useState([])    // todas as famílias do user
  const [familiaAtualId, setFamiliaAtualId]   = useState(null)  // id da família selecionada
  const [membros, setMembros]                 = useState([])
  const [convitesPendentes, setConvitesPendentes] = useState([])
  const [convitesEnviados, setConvitesEnviados]   = useState([])
  const [lancamentos, setLancamentos]         = useState([])
  const [loading, setLoading]                 = useState(true)

  // familia atual (derivado)
  const familia = familias.find(f => f.id === familiaAtualId) ?? null

  // ── Carrega membros de uma família ────────────────────────────────────────
  const loadMembros = useCallback(async (familiaId) => {
    const { data } = await supabase
      .from('familia_membros')
      .select('*')
      .eq('familia_id', familiaId)
      .order('joined_at', { ascending: true })
    setMembros(data ?? [])
  }, [])

  // ── Carrega convites enviados (pendentes) da família ──────────────────────
  const loadConvitesEnviados = useCallback(async (familiaId) => {
    const { data } = await supabase
      .from('familia_convites')
      .select('*')
      .eq('familia_id', familiaId)
      .eq('status', 'pendente')
      .order('created_at', { ascending: false })
    setConvitesEnviados(data ?? [])
  }, [])

  // ── Carrega tudo ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)

    // 1. Busca todos os vínculos do user
    const { data: memberships } = await supabase
      .from('familia_membros')
      .select('familia_id, role')
      .eq('user_id', user.id)

    if (memberships?.length > 0) {
      const ids = memberships.map(m => m.familia_id)

      const { data: fams } = await supabase
        .from('familias')
        .select('*')
        .in('id', ids)
        .order('nome', { ascending: true })

      const familiasComRole = (fams ?? []).map(f => ({
        ...f,
        meu_role: memberships.find(m => m.familia_id === f.id)?.role,
      }))

      setFamilias(familiasComRole)

      // Mantém a seleção atual se ainda válida, senão usa a primeira
      setFamiliaAtualId(prev =>
        prev && ids.includes(prev) ? prev : ids[0]
      )
      setConvitesPendentes([])
    } else {
      // 2. Sem família — verifica convites pendentes
      const { data: convites } = await supabase
        .from('familia_convites')
        .select('*')
        .eq('email', user.email)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false })

      setFamilias([])
      setFamiliaAtualId(null)
      setMembros([])
      setConvitesPendentes(convites ?? [])
    }

    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  // Recarrega membros e convites enviados quando troca de família
  useEffect(() => {
    if (familiaAtualId) {
      loadMembros(familiaAtualId)
      loadConvitesEnviados(familiaAtualId)
    } else {
      setMembros([])
      setConvitesEnviados([])
    }
  }, [familiaAtualId, loadMembros, loadConvitesEnviados])

  // ── Trocar família ativa ──────────────────────────────────────────────────
  const trocarFamilia = useCallback((id) => {
    setFamiliaAtualId(id)
    setLancamentos([])
  }, [])

  // ── Carrega lançamentos do mês ────────────────────────────────────────────
  const fetchLancamentos = useCallback(async (year, month) => {
    if (!familiaAtualId) return
    const pad  = n => String(n).padStart(2, '0')
    const last = new Date(year, month, 0).getDate()
    const start = `${year}-${pad(month)}-01`
    const end   = `${year}-${pad(month)}-${pad(last)}`

    const { data } = await supabase
      .from('lancamentos_familia')
      .select('*')
      .eq('familia_id', familiaAtualId)
      .gte('data_vencimento', start)
      .lte('data_vencimento', end)
      .order('data_vencimento', { ascending: true })

    setLancamentos(data ?? [])
  }, [familiaAtualId])

  // ── Criar família ─────────────────────────────────────────────────────────
  const createFamilia = useCallback(async (nome) => {
    const familiaId = crypto.randomUUID()

    const { error: e1 } = await supabase
      .from('familias')
      .insert({ id: familiaId, nome: nome.trim(), criado_por: user.id })
    if (e1) return { error: e1.message }

    const { error: e2 } = await supabase
      .from('familia_membros')
      .insert({
        familia_id: familiaId,
        user_id:    user.id,
        email:      user.email,
        nome:       user.user_metadata?.full_name || user.email.split('@')[0],
        role:       'admin',
      })
    if (e2) {
      await supabase.from('familias').delete().eq('id', familiaId)
      return { error: e2.message }
    }

    await load()
    setFamiliaAtualId(familiaId)
    return { error: null }
  }, [user, load])

  // ── Convidar membro ───────────────────────────────────────────────────────
  const convidarMembro = useCallback(async (email) => {
    if (!familia) return { error: 'Você não está em uma família.' }
    const emailNorm = email.toLowerCase().trim()
    if (emailNorm === user.email) return { error: 'Você já é membro desta família.' }

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
        familia_id:         familia.id,
        familia_nome:       familia.nome,
        email:              emailNorm,
        convidado_por:      user.id,
        convidado_por_nome: user.user_metadata?.full_name || user.email.split('@')[0],
        status:             'pendente',
      }, { onConflict: 'familia_id,email' })

    if (error) return { error: error.message }
    // Recarrega a lista de convites enviados
    await loadConvitesEnviados(familia.id)
    return { error: null }
  }, [familia, user, loadConvitesEnviados])

  // ── Cancelar convite enviado ──────────────────────────────────────────────
  const cancelarConviteEnviado = useCallback(async (conviteId) => {
    const { error } = await supabase
      .from('familia_convites')
      .update({ status: 'cancelado' })
      .eq('id', conviteId)
    if (error) return { error: error.message }
    setConvitesEnviados(prev => prev.filter(c => c.id !== conviteId))
    return { error: null }
  }, [])

  // ── Aceitar convite ───────────────────────────────────────────────────────
  const aceitarConvite = useCallback(async (convite) => {
    const alvo = convite ?? convitesPendentes[0]
    if (!alvo) return { error: 'Nenhum convite pendente.' }

    const { error: e1 } = await supabase
      .from('familia_membros')
      .insert({
        familia_id: alvo.familia_id,
        user_id:    user.id,
        email:      user.email,
        nome:       user.user_metadata?.full_name || user.email.split('@')[0],
        role:       'membro',
      })
    if (e1) return { error: e1.message }

    await supabase
      .from('familia_convites')
      .update({ status: 'aceito' })
      .eq('id', alvo.id)

    await load()
    return { error: null }
  }, [convitesPendentes, user, load])

  // ── Recusar convite ───────────────────────────────────────────────────────
  const recusarConvite = useCallback(async (convite) => {
    const alvo = convite ?? convitesPendentes[0]
    if (!alvo) return
    await supabase
      .from('familia_convites')
      .update({ status: 'recusado' })
      .eq('id', alvo.id)
    setConvitesPendentes(prev => prev.filter(c => c.id !== alvo.id))
  }, [convitesPendentes])

  // ── Sair da família ───────────────────────────────────────────────────────
  const sairDaFamilia = useCallback(async () => {
    if (!familia) return { error: 'Você não está em uma família.' }
    const { error } = await supabase
      .from('familia_membros')
      .delete()
      .eq('familia_id', familia.id)
      .eq('user_id', user.id)
    if (error) return { error: error.message }
    await load()
    return { error: null }
  }, [familia, user, load])

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
        familia_id:      familia.id,
        criado_por:      user.id,
        criado_por_nome: user.user_metadata?.full_name || user.email.split('@')[0],
      })
      .select()
      .single()
    if (error) return { error: error.message }
    setLancamentos(prev =>
      [...prev, data].sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))
    )
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

  // convitePendente (compat. com código antigo — primeiro da lista)
  const convitePendente = convitesPendentes[0] ?? null

  return {
    familia, familias, familiaAtualId, trocarFamilia,
    membros, convitePendente, convitesPendentes, convitesEnviados, lancamentos, loading,
    fetchLancamentos,
    createFamilia, convidarMembro, cancelarConviteEnviado,
    aceitarConvite, recusarConvite,
    sairDaFamilia, removerMembro,
    addLancamento, updateLancamento, deleteLancamento, togglePago,
    refetch: load,
  }
}
