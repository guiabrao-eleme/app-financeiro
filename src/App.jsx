import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import RegistrosPage from './pages/RegistrosPage'
import ResumoAnualPage from './pages/ResumoAnualPage'
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
          <span className="text-slate-500 text-sm">Carregando...</span>
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
          />
        )
      case 'registros':
        return <RegistrosPage showModal={showModal} />
      case 'anual':
        return <ResumoAnualPage />
      default:
        return (
          <DashboardPage
            showModal={showModal}
            onCloseModal={() => setShowModal(false)}
          />
        )
    }
  }

  const navPage = ['dashboard', 'registros', 'anual'].includes(appPage) ? appPage : 'dashboard'

  return (
    <div>
      <div key={appPage}>{renderPage()}</div>

      <BottomNav active={navPage} onChange={setAppPage} />

      {/* Botão flutuante + — acima do nav, respeita safe area do iPhone */}
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
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  )
}
