import { AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export function UnauthorizedPage() {
  const { signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to access this application. Please contact your administrator to get clinician access.
          </p>
          <button
            onClick={signOut}
            className="btn-primary"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
