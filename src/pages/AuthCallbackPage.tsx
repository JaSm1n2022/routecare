import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Loader2 } from 'lucide-react'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  useEffect(() => {
    console.log('🎯 Auth Callback Page - Processing magic link...')
    console.log('📍 Full URL:', window.location.href)
    console.log('🔗 Hash:', window.location.hash)

    // Parse hash params
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    console.log('🎫 Hash Params:', {
      access_token: hashParams.get('access_token')?.substring(0, 30) + '...',
      refresh_token: hashParams.has('refresh_token'),
      expires_in: hashParams.get('expires_in'),
      token_type: hashParams.get('token_type'),
      type: hashParams.get('type')
    })
  }, [])

  // Once auth is complete and user is logged in, redirect
  useEffect(() => {
    console.log('🔄 Auth state:', { user: !!user, loading })

    if (!loading && user) {
      console.log('✅ User authenticated - redirecting to dashboard')
      // Small delay to ensure all state is updated
      setTimeout(() => {
        navigate('/dashboard', { replace: true })
      }, 500)
    }
  }, [user, loading, navigate])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Signing you in...</h2>
        <p className="text-gray-600">Please wait while we verify your login</p>
      </div>
    </div>
  )
}
