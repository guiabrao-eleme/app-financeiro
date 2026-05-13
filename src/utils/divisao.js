// Utilitários para divisão de contas (estilo Splitwise) em lançamentos de família

/**
 * Cria uma divisão padrão dividindo igualmente entre os membros.
 * @param {Array} membros - lista de { user_id, nome }
 * @returns {Array} divisao - [{ user_id, nome, percentual }]
 */
export function divisaoIgualitaria(membros) {
  if (!membros?.length) return []
  const n = membros.length
  // Arredonda para 2 casas, ajusta o último para fechar 100
  const base = Math.floor(10000 / n) / 100
  return membros.map((m, i) => ({
    user_id:    m.user_id,
    nome:       m.nome,
    percentual: i === n - 1 ? +(100 - base * (n - 1)).toFixed(2) : base,
  }))
}

/**
 * Calcula o valor que cada membro deve numa divisão.
 * @param {number} valorTotal
 * @param {Array} divisao - [{ user_id, nome, percentual }]
 * @returns {Array} - [{ user_id, nome, percentual, valor }]
 */
export function divisaoComValor(valorTotal, divisao) {
  if (!divisao?.length) return []
  return divisao.map(d => ({
    ...d,
    valor: +(valorTotal * (d.percentual / 100)).toFixed(2),
  }))
}

/**
 * Retorna a fatia (percentual + valor) de um usuário num lançamento.
 * Se o lançamento não tem divisão, retorna 100% / valor total.
 */
export function minhaFatia(lancamento, userId) {
  const divisao = lancamento.divisao ?? []
  if (!divisao.length) {
    return { percentual: 100, valor: Number(lancamento.valor ?? 0) }
  }
  const minha = divisao.find(d => d.user_id === userId)
  if (!minha) return { percentual: 0, valor: 0 }
  const valor = Number(lancamento.valor ?? 0) * (minha.percentual / 100)
  return { percentual: minha.percentual, valor: +valor.toFixed(2) }
}

/**
 * Calcula os saldos entre o usuário e os outros membros.
 * Considera apenas lançamentos pagos com pago_por_user_id definido.
 * Retorna { [otherUserId]: { nome, valor } }
 *   valor > 0  → aquela pessoa me deve
 *   valor < 0  → eu devo àquela pessoa
 */
export function calcularSaldos(lancamentos, meuUserId) {
  const saldos = {}

  for (const l of (lancamentos ?? [])) {
    if (!l.pago || !l.pago_por_user_id) continue
    const divisao = l.divisao ?? []
    if (!divisao.length) continue

    const valorTotal = Number(l.valor ?? 0)
    const eh_saida   = l.tipo === 'Saída'

    if (l.pago_por_user_id === meuUserId) {
      // Eu paguei. Cada outro membro me deve a fatia dele.
      for (const d of divisao) {
        if (d.user_id === meuUserId) continue
        const fatia = valorTotal * (d.percentual / 100)
        if (!saldos[d.user_id]) saldos[d.user_id] = { nome: d.nome, valor: 0 }
        // Em saídas, outros me devem; em entradas (recebimento), eu devo a eles a fatia
        saldos[d.user_id].valor += eh_saida ? fatia : -fatia
      }
    } else {
      // Outro pagou. Eu devo a fatia minha pra ele.
      const minha = divisao.find(d => d.user_id === meuUserId)
      if (!minha) continue
      const fatia = valorTotal * (minha.percentual / 100)
      const id = l.pago_por_user_id
      if (!saldos[id]) saldos[id] = { nome: l.pago_por_nome ?? 'Outro membro', valor: 0 }
      saldos[id].valor += eh_saida ? -fatia : fatia
    }
  }

  // Arredonda
  Object.keys(saldos).forEach(k => {
    saldos[k].valor = +saldos[k].valor.toFixed(2)
  })

  return saldos
}

/**
 * Valida se a soma das porcentagens de uma divisão é igual a 100.
 * Tolera diferença de 0.01 por arredondamento.
 */
export function divisaoValida(divisao) {
  if (!divisao?.length) return true
  const soma = divisao.reduce((s, d) => s + Number(d.percentual ?? 0), 0)
  return Math.abs(soma - 100) < 0.05
}
