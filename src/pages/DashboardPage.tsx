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
  FileText,
  Loader2,
  AlertCircle
} from 'lucide-react'

export function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { authUser, employee } = useAuth()
  const metrics = useDashboardMetrics()

  // Determine if user should see monthly or weekly data
  const employeePosition = employee?.position?.trim()
  const isMonthlyUser = employeePosition === 'MSW' || employeePosition === 'Chaplain'
  const periodText = isMonthlyUser ? 'This Month' : t('dashboard.thisWeek')

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
      subtext: periodText
    },
    {
      title: t('dashboard.completedVisits'),
      value: metrics.completedVisits.toString(),
      icon: CheckCircle,
      color: 'bg-purple-500',
      subtext: periodText
    },
    {
      title: t('dashboard.estimatedPayment'),
      value: `$${metrics.estimatedPayment.toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-orange-500',
      subtext: periodText
    },
    {
      title: t('dashboard.actualEarnings'),
      value: `$${metrics.actualEarnings.toFixed(2)}`,
      icon: Wallet,
      color: 'bg-teal-500',
      subtext: periodText
    }
  ]

  const quickActions = [
    {
      title: t('quickActions.routesheet'),
      description: 'Record your visit',
      icon: MapPin,
      href: '/routesheet',
      color: 'bg-blue-50 text-blue-600',
      iconBg: 'bg-blue-100'
    },
    {
      title: 'Services & Earnings',
      description: 'View your completed services and earnings',
      icon: DollarSign,
      href: '/earnings',
      color: 'bg-green-50 text-green-600',
      iconBg: 'bg-green-100'
    },
    {
      title: t('quickActions.pickup'),
      description: t('quickActions.pickupDesc'),
      icon: Package,
      href: '/pickup',
      color: 'bg-purple-50 text-purple-600',
      iconBg: 'bg-purple-100'
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
      title: 'Documents',
      description: 'View and manage your documents',
      icon: FileText,
      href: '/documents',
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
              <div className="flex flex-col items-center flex-1">
                <img
                  src="/images/myroutecare.png"
                  alt="MyRouteCare Logo"
                  className="h-20 w-auto mb-2"
                  style={{ mixBlendMode: 'multiply' }}
                />
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 text-center">
                  {t('dashboard.title')}
                </h1>
              </div>
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
          <div className="flex items-center gap-4">
            <HamburgerMenu />
            <div className="flex flex-col items-center flex-1">
              <img
                src="/images/myroutecare.png"
                alt="MyRouteCare Logo"
                className="h-20 w-auto mb-2"
                style={{ mixBlendMode: 'multiply' }}
              />
              <div className="text-center">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {employee?.name || authUser?.email?.split('@')[0]}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {new Date().toLocaleDateString('en-US', {
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

        {/* Client Assignments */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">My Client Assignments</h2>
            <span className="text-sm text-gray-500">{metrics.assignments.length} {metrics.assignments.length === 1 ? 'client' : 'clients'}</span>
          </div>
          <div className="space-y-3">
            {metrics.assignments.length > 0 ? (
              metrics.assignments.map((assignment) => (
                <div key={assignment.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 mb-2">{assignment.patientCd}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Frequency:</span>
                          <span className="ml-2 font-medium text-gray-900">{assignment.frequencyVisit}x/{assignment.visitType}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Days:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {Array.isArray(assignment.dayOfTheWeek)
                              ? assignment.dayOfTheWeek.join(', ')
                              : assignment.dayOfTheWeek}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Time:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {assignment.timeOfVisit || 'Not specified'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No client assignments found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
