// Utilitário para buscar lançamentos das famílias do usuário e mesclá-los com os pessoais
import { supabase } from '../lib/supabase'

/**
 * Busca lançamentos de todas as famílias do usuário no intervalo de datas.
 * Retorna array normalizado com _origem:'familia' e _familia_nome.
 *
 * @param {string} userId
 * @param {string} fields  - campos para o select (ex: '*' ou 'tipo,categoria,valor')
 * @param {string} start   - data inicial YYYY-MM-DD (opcional)
 * @param {string} end     - data final   YYYY-MM-DD (opcional)
 */
export async function fetchFamiliaLancamentos(userId, fields = '*', start = null, end = null) {
  // 1. IDs das famílias do usuário
  const { data: memberships } = await supabase
    .from('familia_membros')
    .select('familia_id')
    .eq('user_id', userId)

  if (!memberships?.length) return []

  const familyIds = memberships.map(m => m.familia_id)

  // 2. Nomes das famílias
  const { data: familias } = await supabase
    .from('familias')
    .select('id, nome')
    .in('id', familyIds)

  const familiaMap = Object.fromEntries((familias ?? []).map(f => [f.id, f.nome]))

  // 3. Lançamentos da família
  let query = supabase
    .from('lancamentos_familia')
    .select(fields)
    .in('familia_id', familyIds)

  if (start) query = query.gte('data_vencimento', start)
  if (end)   query = query.lte('data_vencimento', end)

  const { data } = await query

  // 4. Marca cada item com origem e nome da família
  return (data ?? []).map(l => ({
    ...l,
    _origem:       'familia',
    _familia_nome: familiaMap[l.familia_id] ?? 'Família',
  }))
}
