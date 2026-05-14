import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { supabase } from './lib/supabase'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import RegistrosPage from './pages/RegistrosPage'
import ResumoAnualPage from './pages/ResumoAnualPage'
import ObservacoesPage from './pages/ObservacoesPage'
import CalendarioPage from './pages/CalendarioPage'
import FamiliaPage from './pages/FamiliaPage'
import PerfilPage from './pages/PerfilPage'
import BottomNav from './components/layout/BottomNav'
import NovoRegistroModal from './components/forms/NovoRegistroModal'

function AppRouter() {
  const { user, loading } = useAuth()
  const [authPage, setAuthPage]     = useState('login')
  const [appPage, setAppPage]       = useState('dashboard')
  const [showModal, setShowModal]   = useState(false)
  const [familiaNotif, setFamiliaNotif] = useState(false)
  // ID da família para abrir direto no detalhe (deep-link de Registros)
  const [familiaInicial, setFamiliaInicial] = useState(null)

  // Rede de segurança: garante que body fique destravado ao mudar de aba.
  // Caso algum modal/sheet tenha deixado body com position:fixed por engano,
  // isso restaura o scroll normal da página.
  useEffect(() => {
    if (showModal) return // se há modal ativo, deixa ele gerenciar
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.width = ''
    document.body.style.overflowY = ''
    document.body.style.overflow = ''
  }, [appPage, showModal])

  // Navega para a aba Família já abrindo o detalhe de uma família específica
  const abrirFamilia = (familiaId) => {
    setFamiliaInicial(familiaId)
    setAppPage('familia')
  }

  // Verifica convite pendente para mostrar badge na aba Família
  useEffect(() => {
    if (!user) return
    supabase
      .from('familia_convites')
      .select('id', { count: 'exact', head: true })
      .eq('email', user.email)
      .eq('status', 'pendente')
      .then(({ count }) => setFamiliaNotif((count ?? 0) > 0))
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 dark:text-slate-400 text-sm">Carregando...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    if (authPage === 'register') {
      return <RegisterPage onNavigateToLogin={() => setAuthPage('login')} />
    }
    return <LoginPage onNavigateToRegister={() => setAuthPage('register')} />
  }

  const renderPage = () => {
    switch (appPage) {
      case 'dashboard':
        return (
          <DashboardPage
            showModal={showModal}
            onCloseModal={() => setShowModal(false)}
            onOpenPerfil={() => setAppPage('perfil')}
          />
        )
      case 'registros':
        return <RegistrosPage showModal={showModal} onOpenFamilia={abrirFamilia} />
      case 'anual':
        return <ResumoAnualPage onOpenFamilia={abrirFamilia} />
      case 'calendario':
        return <CalendarioPage onOpenFamilia={abrirFamilia} />
      case 'familia':
        return (
          <FamiliaPage
            onConviteHandled={() => setFamiliaNotif(false)}
            initialDetalheId={familiaInicial}
            onDetalheClosed={() => setFamiliaInicial(null)}
          />
        )
      case 'observacoes':
        return <ObservacoesPage />
      case 'perfil':
        return <PerfilPage onBack={() => setAppPage('dashboard')} />
      default:
        return (
          <DashboardPage
            showModal={showModal}
            onCloseModal={() => setShowModal(false)}
            onOpenPerfil={() => setAppPage('perfil')}
          />
        )
    }
  }

  const navPage = ['dashboard', 'registros', 'familia', 'calendario', 'anual', 'observacoes'].includes(appPage) ? appPage : 'dashboard'

  return (
    <div className="mx-auto max-w-xl bg-background min-h-screen relative shadow-xl shadow-slate-200/40 dark:shadow-black/40">
      <div key={appPage}>{renderPage()}</div>

      {appPage !== 'perfil' && (
        <BottomNav
          active={navPage}
          onChange={setAppPage}
          badges={{ familia: familiaNotif }}
        />
      )}

      {/* Botão flutuante + — oculto na aba Notas, Perfil e Família
          (a Família tem seu próprio botão + dentro do detalhe, que abre o
          formulário de família com divisão entre membros) */}
      {appPage !== 'observacoes' && appPage !== 'perfil' && appPage !== 'familia' && (
        <button
          onClick={() => setShowModal(true)}
          className="fixed w-14 h-14 bg-primary text-white rounded-full shadow-lg
            flex items-center justify-center text-3xl font-light hover:bg-primary/90 active:scale-95
            transition-all z-50"
          style={{
            // Posicionado relativo ao container max-w-xl quando em telas grandes
            bottom: 'calc(env(safe-area-inset-bottom) + 5rem)',
            right: 'max(1rem, calc((100vw - 36rem) / 2 + 1rem))',
          }}
          aria-label="Novo registro"
        >
          +
        </button>
      )}

      {/* Modal global — funciona em qualquer aba */}
      <NovoRegistroModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSaved={() => setShowModal(false)}
      />
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ThemeProvider>
  )
}
