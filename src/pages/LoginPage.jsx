import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'

export default function LoginPage({ onNavigateToRegister }) {
  const { signIn } = useAuth()
  const { addToast, ToastContainer } = useToast()

  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const errs = {}
    if (!form.email) errs.email = 'E-mail é obrigatório'
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'E-mail inválido'
    if (!form.password) errs.password = 'Senha é obrigatória'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    const { error } = await signIn(form.email, form.password)
    setLoading(false)

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        addToast('E-mail ou senha incorretos', 'error')
      } else {
        addToast(error.message, 'error')
      }
    }
  }

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <ToastContainer />

      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-white font-bold text-xl">R$</span>
        </div>
        <h1 className="text-2xl font-bold text-primary">GuiGabi Finanças</h1>
        <p className="text-slate-500 text-sm mt-1">Controle financeiro do casal</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-6">Entrar na conta</h2>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* E-mail */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
            <input
              type="email"
              value={form.email}
              onChange={e => handleChange('email', e.target.value)}
              placeholder="seu@email.com"
              className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all
                ${errors.email
                  ? 'border-danger bg-red-50 focus:ring-2 focus:ring-danger/20'
                  : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10'}`}
            />
            {errors.email && <p className="text-danger text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Senha */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <input
              type="password"
              value={form.password}
              onChange={e => handleChange('password', e.target.value)}
              placeholder="••••••••"
              className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all
                ${errors.password
                  ? 'border-danger bg-red-50 focus:ring-2 focus:ring-danger/20'
                  : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10'}`}
            />
            {errors.password && <p className="text-danger text-xs mt-1">{errors.password}</p>}
          </div>

          {/* Botão */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm
              hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {/* Link cadastro */}
        <p className="text-center text-sm text-slate-500 mt-6">
          Não tem conta?{' '}
          <button
            onClick={onNavigateToRegister}
            className="text-primary font-semibold hover:underline"
          >
            Criar conta
          </button>
        </p>
      </div>
    </div>
  )
}
