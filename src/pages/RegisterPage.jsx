import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'

export default function RegisterPage({ onNavigateToLogin }) {
  const { signUp } = useAuth()
  const { addToast, ToastContainer } = useToast()

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Nome é obrigatório'
    if (!form.email) errs.email = 'E-mail é obrigatório'
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'E-mail inválido'
    if (!form.password) errs.password = 'Senha é obrigatória'
    else if (form.password.length < 6) errs.password = 'Senha deve ter pelo menos 6 caracteres'
    if (!form.confirmPassword) errs.confirmPassword = 'Confirme sua senha'
    else if (form.password !== form.confirmPassword) errs.confirmPassword = 'As senhas não coincidem'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    const { error } = await signUp(form.email, form.password, form.name.trim())
    setLoading(false)

    if (error) {
      if (error.message.includes('already registered')) {
        addToast('Este e-mail já está cadastrado', 'error')
      } else {
        addToast(error.message, 'error')
      }
    } else {
      setSuccess(true)
    }
  }

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
        <img src="/capa.jpg" alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-primary/70 backdrop-blur-sm" />
        <div className="relative z-10 w-full max-w-sm bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Conta criada!</h2>
          <p className="text-slate-500 text-sm mb-6">
            Verifique seu e-mail para confirmar o cadastro, depois faça login.
          </p>
          <button
            onClick={onNavigateToLogin}
            className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all"
          >
            Ir para o login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
      <ToastContainer />

      {/* Plano de fundo — foto capa */}
      <img
        src="/capa.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-primary/70 backdrop-blur-sm" />

      {/* Conteúdo */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">

        {/* Logo */}
        <div className="mb-6 text-center">
          <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-3 shadow-xl ring-2 ring-white/30">
            <img
              src="/apple-touch-icon.png"
              alt="GuiGabi Finanças"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-xl font-bold text-white drop-shadow">GuiGabi Finanças</h1>
        </div>

        {/* Card */}
        <div className="w-full bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Criar conta</h2>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome completo</label>
              <input
                type="text"
                value={form.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="Seu nome"
                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all
                  ${errors.name
                    ? 'border-danger bg-red-50 focus:ring-2 focus:ring-danger/20'
                    : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10'}`}
              />
              {errors.name && <p className="text-danger text-xs mt-1">{errors.name}</p>}
            </div>

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
                placeholder="Mínimo 6 caracteres"
                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all
                  ${errors.password
                    ? 'border-danger bg-red-50 focus:ring-2 focus:ring-danger/20'
                    : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10'}`}
              />
              {errors.password && <p className="text-danger text-xs mt-1">{errors.password}</p>}
            </div>

            {/* Confirmar Senha */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar senha</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={e => handleChange('confirmPassword', e.target.value)}
                placeholder="Repita a senha"
                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all
                  ${errors.confirmPassword
                    ? 'border-danger bg-red-50 focus:ring-2 focus:ring-danger/20'
                    : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10'}`}
              />
              {errors.confirmPassword && <p className="text-danger text-xs mt-1">{errors.confirmPassword}</p>}
            </div>

            {/* Botão */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm
                hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>

          {/* Link login */}
          <p className="text-center text-sm text-slate-500 mt-6">
            Já tem conta?{' '}
            <button
              onClick={onNavigateToLogin}
              className="text-primary font-semibold hover:underline"
            >
              Entrar
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
