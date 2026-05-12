// Gerador de arquivo ICS (iCalendar) para importação no Google Calendar, Apple Calendar, etc.

function pad(n) {
  return String(n).padStart(2, '0')
}

// Retorna a data seguinte no formato YYYYMMDD (para DTEND)
function nextDateICS(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + 1)
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}`
}

function toDateICS(dateStr) {
  return dateStr.replace(/-/g, '') // YYYY-MM-DD → YYYYMMDD
}

// Escapa caracteres especiais do formato ICS
function esc(str) {
  return String(str ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function brl(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0)
}

/**
 * Gera o conteúdo de um arquivo .ics a partir de uma lista de lançamentos.
 * Lançamentos com notificar=true recebem um VALARM com antecedência de dias_aviso dias.
 */
export function generateICS(lancamentos) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GuiGabi Financas//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Financas GuiGabi',
    'X-WR-TIMEZONE:America/Sao_Paulo',
  ]

  for (const l of lancamentos) {
    if (!l.data_vencimento) continue

    const dateStart = toDateICS(l.data_vencimento)
    const dateEnd   = nextDateICS(l.data_vencimento)
    const emoji     = l.tipo === 'Entrada' ? '💚' : '🔴'
    const summary   = `${emoji} ${l.descricao} · ${brl(l.valor)}`
    const desc      = `${l.tipo} · ${l.categoria}`

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:lancamento-${l.id}@guigabi`)
    lines.push(`DTSTART;VALUE=DATE:${dateStart}`)
    lines.push(`DTEND;VALUE=DATE:${dateEnd}`)
    lines.push(`SUMMARY:${esc(summary)}`)
    lines.push(`DESCRIPTION:${esc(desc)}`)

    // Alarme de aviso configurado pelo usuário
    if (l.notificar && l.dias_aviso > 0) {
      const dias = l.dias_aviso
      lines.push('BEGIN:VALARM')
      lines.push('ACTION:DISPLAY')
      lines.push(`TRIGGER:-P${dias}D`)
      lines.push(`DESCRIPTION:${esc(`Vencimento em ${dias} dia${dias > 1 ? 's' : ''}: ${l.descricao}`)}`)
      lines.push('END:VALARM')
    }

    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

/**
 * Dispara download de um arquivo .ics no browser.
 */
export function downloadICS(filename, lancamentos) {
  const content = generateICS(lancamentos)
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
