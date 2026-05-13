// Utilitário para buscar lançamentos das famílias do usuário e mesclá-los com os pessoais
import { supabase } from '../lib/supabase'
import { minhaFatia } from './divisao'

/**
 * Busca resumos (a receber / a pagar do mês) para uma lista de famílias.
 * Retorna objeto { [familiaId]: { receber, pagar } }
 */
export async function fetchResumosFamilias(familyIds, year, month) {
  if (!familyIds?.length) return {}
  const pad  = n => String(n).padStart(2, '0')
  const last = new Date(year, month, 0).getDate()
  const start = `${year}-${pad(month)}-01`
  const end   = `${year}-${pad(month)}-${pad(last)}`

  const { data } = await supabase
    .from('lancamentos_familia')
    .select('familia_id, tipo, valor, pago')
    .in('familia_id', familyIds)
    .gte('data_vencimento', start)
    .lte('data_vencimento', end)
    .eq('pago', false)

  const resumos = {}
  familyIds.forEach(id => { resumos[id] = { receber: 0, pagar: 0 } })

  for (const l of (data ?? [])) {
    const v = Number(l.valor)
    if (l.tipo === 'Entrada') resumos[l.familia_id].receber += v
    else                       resumos[l.familia_id].pagar   += v
  }

  return resumos
}

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

  // 4. Marca cada item com origem, nome da família e fatia do usuário
  return (data ?? []).map(l => {
    const fatia = minhaFatia(l, userId)
    return {
      ...l,
      _origem:        'familia',
      _familia_nome:  familiaMap[l.familia_id] ?? 'Família',
      _valor_total:   Number(l.valor ?? 0),
      _fatia_pct:     fatia.percentual,
      // Substitui o "valor" pela fatia do usuário, para que os totais agregados
      // do Dashboard/Calendário/Resumo Anual reflitam a parte real dele.
      valor:          fatia.valor,
    }
  })
}
