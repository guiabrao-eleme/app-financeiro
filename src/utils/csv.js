// BOM UTF-8 garante que Excel abre com acentos corretamente
const BOM = '﻿'

export function downloadCSV(filename, headers, rows) {
  const lines = [
    headers.join(';'),
    ...rows.map(row =>
      row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';')
    ),
  ]
  const blob = new Blob([BOM + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function formatCSVCurrency(value) {
  return Number(value ?? 0).toFixed(2).replace('.', ',')
}
