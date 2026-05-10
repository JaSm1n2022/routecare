import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { HamburgerMenu } from '../components/HamburgerMenu'
import { User, Mail, Briefcase, Building, Phone } from 'lucide-react'

export function ProfilePage() {
  const { t } = useTranslation()
  const { authUser, employee, profile } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <HamburgerMenu />
            <div className="flex flex-col items-center flex-1">
              <img
                src="/images/myroutecare.png"
                alt="MyRouteCare Logo"
                className="h-20 w-auto mb-2"
                style={{ mixBlendMode: 'multiply' }}
              />
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 text-center">
                {t('navigation.profile')}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-8">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-blue-600" />
              </div>
              <div className="text-white">
                <h2 className="text-2xl font-bold">
                  {employee?.name || authUser?.email?.split('@')[0]}
                </h2>
                <p className="text-blue-100 mt-1">{employee?.position || 'Clinician'}</p>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('navigation.profile')}</h2>

              <div className="space-y-4">
                {employee?.name && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <User className="w-5 h-5 text-gray-600" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Full Name</p>
                      <p className="font-medium text-gray-900">{employee.name}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <Mail className="w-5 h-5 text-gray-600" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium text-gray-900">{authUser?.email}</p>
                  </div>
                </div>

                {employee?.position && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <Briefcase className="w-5 h-5 text-gray-600" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Position</p>
                      <p className="font-medium text-gray-900">{employee.position}</p>
                    </div>
                  </div>
                )}

                {employee?.phone && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <Phone className="w-5 h-5 text-gray-600" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium text-gray-900">{employee.phone}</p>
                    </div>
                  </div>
                )}

                {(profile as any)?.company_name && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <Building className="w-5 h-5 text-gray-600" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Company</p>
                      <p className="font-medium text-gray-900">{(profile as any)?.company_name}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <span className={`w-3 h-3 rounded-full ${employee?.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="font-medium text-gray-900 capitalize">{employee?.status || 'Unknown'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
