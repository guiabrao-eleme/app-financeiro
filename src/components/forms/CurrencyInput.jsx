import { useState, useEffect } from 'react'

const format = (num) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num)

export default function CurrencyInput({ value, onChange, error, placeholder = '0,00' }) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw] = useState(value ? format(value) : '')

  // Sincroniza quando o valor externo muda (ex: reset do formulário)
  useEffect(() => {
    if (!focused) {
      setRaw(value ? format(value) : '')
    }
  }, [value, focused])

  const handleChange = (e) => {
    let v = e.target.value.replace(/[^\d,]/g, '')
    setRaw(v)
  }

  const handleBlur = () => {
    setFocused(false)
    const normalized = raw.replace(',', '.')
    const num = parseFloat(normalized)
    if (!isNaN(num) && num > 0) {
      onChange(num)
      setRaw(format(num))
    } else {
      onChange(0)
      setRaw('')
    }
  }

  const handleFocus = () => {
    setFocused(true)
    if (value) setRaw(String(value).replace('.', ','))
  }

  return (
    <div className={`flex items-center w-full border rounded-xl px-4 py-3 gap-2 transition-all dark:bg-slate-700
      ${error
        ? 'border-danger bg-red-50 dark:bg-red-900/20 ring-2 ring-danger/20'
        : focused
          ? 'border-primary ring-2 ring-primary/10'
          : 'border-slate-200 dark:border-slate-600'}`}
    >
      <span className="text-slate-500 dark:text-slate-400 text-sm font-medium select-none">R$</span>
      <input
        type="text"
        inputMode="decimal"
        value={raw}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={placeholder}
        className="flex-1 outline-none text-sm bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
      />
    </div>
  )
}
