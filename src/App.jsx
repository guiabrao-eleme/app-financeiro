import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import RegistrosPage from './pages/RegistrosPage'
import ResumoAnualPage from './pages/ResumoAnualPage'
import ObservacoesPage from './pages/ObservacoesPage'
import CalendarioPage from './pages/CalendarioPage'
import PerfilPage from './pages/PerfilPage'
import BottomNav from './components/layout/BottomNav'
import NovoRegistroModal from './components/forms/NovoRegistroModal'

function AppRouter() {
  const { user, loading } = useAuth()
  const [authPage, setAuthPage] = useState('login')
  const [appPage, setAppPage] = useState('dashboard')
  const [showModal, setShowModal] = useState(false)

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
        return <RegistrosPage showModal={showModal} />
      case 'anual':
        return <ResumoAnualPage />
      case 'calendario':
        return <CalendarioPage />
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

  const navPage = ['dashboard', 'registros', 'calendario', 'anual', 'observacoes'].includes(appPage) ? appPage : 'dashboard'

  return (
    <div>
      <div key={appPage}>{renderPage()}</div>

      {appPage !== 'perfil' && <BottomNav active={navPage} onChange={setAppPage} />}

      {/* Botão flutuante + — oculto na aba Notas e Perfil */}
      {appPage !== 'observacoes' && appPage !== 'perfil' && (
        <button
          onClick={() => setShowModal(true)}
          className="fixed right-4 w-14 h-14 bg-primary text-white rounded-full shadow-lg
            flex items-center justify-center text-2xl font-light hover:bg-primary/90 active:scale-95
            transition-all z-50"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}
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
