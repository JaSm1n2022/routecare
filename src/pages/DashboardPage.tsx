import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useDashboardMetrics } from '../hooks/useDashboardMetrics'
import { HamburgerMenu } from '../components/HamburgerMenu'
import {
  Users,
  Calendar,
  CheckCircle,
  DollarSign,
  Wallet,
  MapPin,
  Package,
  TrendingUp,
  Receipt,
  Loader2,
  AlertCircle
} from 'lucide-react'

export function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { authUser, employee } = useAuth()
  const metrics = useDashboardMetrics()

  const stats = [
    {
      title: t('dashboard.assignedPatients'),
      value: metrics.assignedPatients.toString(),
      icon: Users,
      color: 'bg-blue-500',
      subtext: metrics.assignedPatients === 0 ? t('dashboard.noActivePatients') : 'As of Today'
    },
    {
      title: t('dashboard.scheduledVisits'),
      value: metrics.scheduledVisits.toString(),
      icon: Calendar,
      color: 'bg-green-500',
      subtext: t('dashboard.thisWeek')
    },
    {
      title: t('dashboard.completedVisits'),
      value: metrics.completedVisits.toString(),
      icon: CheckCircle,
      color: 'bg-purple-500',
      subtext: t('dashboard.thisWeek')
    },
    {
      title: t('dashboard.estimatedPayment'),
      value: `$${metrics.estimatedPayment.toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-orange-500',
      subtext: t('dashboard.thisWeek')
    },
    {
      title: t('dashboard.actualEarnings'),
      value: `$${metrics.actualEarnings.toFixed(2)}`,
      icon: Wallet,
      color: 'bg-teal-500',
      subtext: t('dashboard.thisWeek')
    }
  ]

  const quickActions = [
    {
      title: t('quickActions.routesheet'),
      description: t('quickActions.routesheetDesc'),
      icon: MapPin,
      href: '/routesheet',
      color: 'bg-blue-50 text-blue-600',
      iconBg: 'bg-blue-100'
    },
    {
      title: t('quickActions.pickup'),
      description: t('quickActions.pickupDesc'),
      icon: Package,
      href: '/pickup',
      color: 'bg-green-50 text-green-600',
      iconBg: 'bg-green-100'
    },
    {
      title: t('quickActions.delivery'),
      description: t('quickActions.deliveryDesc'),
      icon: TrendingUp,
      href: '/delivery',
      color: 'bg-purple-50 text-purple-600',
      iconBg: 'bg-purple-100'
    },
    {
      title: t('quickActions.serviceEarnings'),
      description: t('quickActions.earningsDesc'),
      icon: Receipt,
      href: '/earnings',
      color: 'bg-orange-50 text-orange-600',
      iconBg: 'bg-orange-100'
    }
  ]

  // Show loading state
  if (metrics.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (metrics.error) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <HamburgerMenu />
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                {t('dashboard.title')}
              </h1>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-900">Error Loading Dashboard</h3>
                <p className="text-sm text-red-700 mt-1">{metrics.error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <HamburgerMenu />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {t('dashboard.welcome')}, {employee?.first_name || authUser?.email?.split('@')[0]}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {employee?.position || 'Clinician'} • {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
          {stats.map((stat) => (
            <div key={stat.title} className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-gray-600 text-sm font-medium mb-1 line-clamp-1">{stat.title}</h3>
              <p className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.subtext}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('header.quickActions')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <button
                key={action.title}
                onClick={() => navigate(action.href)}
                className={`${action.color} rounded-lg shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow text-left`}
              >
                <div className={`${action.iconBg} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                  <action.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                <p className="text-sm text-gray-600">{action.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* This Week's Schedule */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{t('dashboard.scheduledVisits')} - {t('dashboard.thisWeek')}</h2>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {/* Sample schedule items */}
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex-shrink-0 w-20 text-center">
                <p className="text-xs text-gray-500 font-medium">MON</p>
                <p className="text-lg font-bold text-gray-900">9:00</p>
                <p className="text-xs text-gray-500">AM</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">Morning Visit - Patient A</p>
                <p className="text-sm text-gray-600 mt-1">123 Main St, City, ST 12345</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Scheduled
                  </span>
                  <span className="text-xs text-gray-500">$90 est.</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex-shrink-0 w-20 text-center">
                <p className="text-xs text-gray-500 font-medium">TUE</p>
                <p className="text-lg font-bold text-gray-900">11:30</p>
                <p className="text-xs text-gray-500">AM</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">Assessment - Patient B</p>
                <p className="text-sm text-gray-600 mt-1">456 Oak Ave, City, ST 12345</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Scheduled
                  </span>
                  <span className="text-xs text-gray-500">$120 est.</span>
                </div>
              </div>
            </div>

            <div className="text-center py-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">+ 3 more visits this week</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
