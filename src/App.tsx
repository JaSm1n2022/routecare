import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProfilePage } from './pages/ProfilePage'
import { RoutesheetPage } from './pages/RoutesheetPage'
import { EarningsPage } from './pages/EarningsPage'
import { PickupPage } from './pages/PickupPage'
import { DeliveryPage } from './pages/DeliveryPage'
import { UnauthorizedPage } from './pages/UnauthorizedPage'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'

// Loading component
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  )
}

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, employee, loading } = useAuth()

  console.log('ProtectedRoute:', { user: !!user, profile, employee, loading })

  if (loading) {
    return <LoadingScreen />
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Allow access if user is logged in (simplified for now)
  // TODO: Re-enable role checking after database is set up
  // if (profile && profile.role !== 'clinician') {
  //   return <Navigate to="/unauthorized" replace />
  // }

  // if (profile?.role === 'clinician' && !employee) {
  //   return <Navigate to="/unauthorized" replace />
  // }

  // if (employee && employee.status !== 'active') {
  //   return <Navigate to="/unauthorized" replace />
  // }

  return <>{children}</>
}

// Public Route wrapper (redirects to dashboard if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  console.log('PublicRoute:', { user: !!user, loading })

  if (loading) {
    return <LoadingScreen />
  }

  // If authenticated, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  const location = useLocation()
  const { loading } = useAuth()

  useEffect(() => {
    // Check if this is a magic link callback (has tokens in URL)
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const hasAuthTokens = hashParams.has('access_token')

    if (hasAuthTokens) {
      console.log('🔗 Magic link detected in AppRoutes!')
      console.log('📍 Current path:', location.pathname)
      console.log('🎫 Token preview:', hashParams.get('access_token')?.substring(0, 30) + '...')
    }
  }, [location])

  // If we have auth tokens in URL and still loading, show loading screen
  const hashParams = new URLSearchParams(window.location.hash.substring(1))
  const hasAuthTokens = hashParams.has('access_token')

  if (hasAuthTokens && loading) {
    return <AuthCallbackPage />
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/earnings"
        element={
          <ProtectedRoute>
            <EarningsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/routesheet"
        element={
          <ProtectedRoute>
            <RoutesheetPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pickup"
        element={
          <ProtectedRoute>
            <PickupPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/delivery"
        element={
          <ProtectedRoute>
            <DeliveryPage />
          </ProtectedRoute>
        }
      />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
