import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  Menu,
  X,
  Home,
  User,
  Globe,
  LogOut,
  MapPin,
  Package,
  TrendingUp,
  DollarSign
} from 'lucide-react'

export function HamburgerMenu() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { t, i18n } = useTranslation()
  const { signOut, employee, authUser } = useAuth()
  const navigate = useNavigate()

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('language', lng)
  }

  const handleNavigate = (path: string) => {
    navigate(path)
    setMenuOpen(false)
  }

  const handleSignOut = async () => {
    await signOut()
    setMenuOpen(false)
  }

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setMenuOpen(true)}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6 text-gray-700" />
      </button>

      {/* Backdrop */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <img
                src="/images/myroutecare.png"
                alt="MyRouteCare Logo"
                className="h-16 w-auto"
                style={{ mixBlendMode: 'multiply' }}
              />
            </div>
            <button
              onClick={() => setMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            {/* User Info */}
            <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {employee?.name || authUser?.email?.split('@')[0]}
                  </p>
                  <p className="text-sm text-gray-600 truncate">{authUser?.email}</p>
                </div>
              </div>
            </div>

            {/* Navigation Section */}
            <div className="p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">
                {t('header.navigation')}
              </h3>
              <nav className="space-y-1">
                <button
                  onClick={() => handleNavigate('/dashboard')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white transition-all"
                >
                  <Home className="w-5 h-5" />
                  <span className="font-medium">{t('navigation.home')}</span>
                </button>
                <button
                  onClick={() => handleNavigate('/profile')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-all"
                >
                  <User className="w-5 h-5" />
                  <span className="font-medium">{t('navigation.profile')}</span>
                </button>
              </nav>
            </div>

            {/* Language Section */}
            <div className="p-4 border-t border-gray-200">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">
                {t('header.language')}
              </h3>
              <div className="space-y-1">
                <button
                  onClick={() => changeLanguage('en')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    i18n.language === 'en'
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Globe className="w-5 h-5" />
                  <span className="font-medium">English</span>
                </button>
                <button
                  onClick={() => changeLanguage('es')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    i18n.language === 'es'
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Globe className="w-5 h-5" />
                  <span className="font-medium">Español</span>
                </button>
              </div>
            </div>

            {/* Quick Actions Section */}
            <div className="p-4 border-t border-gray-200">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">
                {t('header.quickActions')}
              </h3>
              <div className="space-y-1">
                <button
                  onClick={() => handleNavigate('/routesheet')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-all"
                >
                  <MapPin className="w-5 h-5" />
                  <span className="font-medium">{t('quickActions.routesheet')}</span>
                </button>
                <button
                  onClick={() => handleNavigate('/pickup')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-all"
                >
                  <Package className="w-5 h-5" />
                  <span className="font-medium">{t('quickActions.pickup')}</span>
                </button>
                <button
                  onClick={() => handleNavigate('/delivery')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-all"
                >
                  <TrendingUp className="w-5 h-5" />
                  <span className="font-medium">{t('quickActions.delivery')}</span>
                </button>
                <button
                  onClick={() => handleNavigate('/earnings')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-all"
                >
                  <DollarSign className="w-5 h-5" />
                  <span className="font-medium">Services & Earnings</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sign Out Button */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">{t('auth.signOut')}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
