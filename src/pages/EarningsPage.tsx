import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, DollarSign, Printer } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { HamburgerMenu } from '../components/HamburgerMenu'
import { getThisWeekDateRange, getThisMonthDateRange } from '../utils/dateHelpers'
import dayjs from 'dayjs'
import { pdf } from '@react-pdf/renderer'
import { RoutesheetPrintDocument } from '../components/RoutesheetPrintDocument'
import { getImageBase64 } from '../utils/helper'

interface Routesheet {
  id: string
  dosStart: string
  dosEnd?: string
  timeIn?: string
  timeOut?: string
  patientCd: string
  service: string
  serviceCd?: string
  signature_based?: string
  comments?: string
  estimatedPayment: number
}

export function EarningsPage() {
  const navigate = useNavigate()
  const { employee } = useAuth()
  const [routesheets, setRoutesheets] = useState<Routesheet[]>([])
  const [loading, setLoading] = useState(true)
  const [printLoading, setPrintLoading] = useState(false)
  const [totalEarnings, setTotalEarnings] = useState(0)

  // Date range state - default to this week or this month based on position
  const employeePosition = employee?.position?.trim()
  const isMonthlyUser = employeePosition === 'MSW' || employeePosition === 'Chaplain'
  const defaultDateRange = isMonthlyUser ? getThisMonthDateRange() : getThisWeekDateRange()

  const [dateStart, setDateStart] = useState(dayjs(defaultDateRange.from).format('YYYY-MM-DD'))
  const [dateEnd, setDateEnd] = useState(dayjs(defaultDateRange.to).format('YYYY-MM-DD'))

  const fetchRoutesheets = async () => {
    if (!employee?.id || !employee?.companyId) return

    try {
      setLoading(true)
      console.log('📊 Fetching routesheets for earnings:', {
        employeeId: employee.id,
        companyId: employee.companyId,
        from: dateStart,
        to: dateEnd
      })

      // Format dates as YYYY-MM-DD HH:MM:SS for Supabase
      const fromDateTime = `${dateStart} 00:00:00`
      const toDateTime = `${dateEnd} 23:59:59`

      console.log('📅 Query date range:', { fromDateTime, toDateTime })

      const { data, error } = await supabase
        .from('routesheets')
        .select('id, dosStart, dosEnd, timeIn, timeOut, patientCd, service, serviceCd, signature_based, comments, estimatedPayment')
        .eq('companyId', employee.companyId)
        .eq('requestorId', employee.id)
        .gte('dosStart', fromDateTime)
        .lte('dosStart', toDateTime)
        .order('dosStart', { ascending: false })

      if (error) throw error

      console.log('✅ Routesheets fetched:', data?.length)
      setRoutesheets(data || [])

      // Calculate total earnings
      const total = (data || []).reduce((sum, sheet) => {
        return sum + (parseFloat(sheet.estimatedPayment?.toString() || '0'))
      }, 0)
      setTotalEarnings(total)

    } catch (error) {
      console.error('❌ Error fetching routesheets:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoutesheets()
  }, [employee?.id])

  const handleApply = () => {
    fetchRoutesheets()
  }

  const handlePrint = async () => {
    if (!routesheets || routesheets.length === 0) {
      alert('No data available to print')
      return
    }

    try {
      setPrintLoading(true)

      // Load logo from Supabase
      const logoUrl = 'https://acwocotrngkeaxtzdzfz.supabase.co/storage/v1/object/public/images/headerdoc.png'
      let logoBase64: string | undefined = undefined

      try {
        logoBase64 = await getImageBase64(logoUrl)
        console.log('✅ Logo loaded successfully')
      } catch (error) {
        console.error('⚠️ Failed to load logo, continuing without it:', error)
        // Continue without logo if it fails to load
      }

      // Generate PDF
      const pdfDocument = (
        <RoutesheetPrintDocument
          routesheets={routesheets}
          employeeName={employee?.name || ''}
          position={employee?.position || ''}
          logoBase64={logoBase64}
        />
      )

      const blob = await pdf(pdfDocument).toBlob()

      // Create filename with date
      const dateStr = dayjs().format('YYYY-MM-DD')
      const filename = `routesheet_${dateStr}.pdf`

      // Download the PDF
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      link.click()
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setPrintLoading(false)
    }
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
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 text-center">
                Services & Earnings
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Date Filter Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="w-full sm:w-auto sm:flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Start
              </label>
              <input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="w-full sm:w-auto sm:flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date End
              </label>
              <input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              onClick={handleApply}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Total Earnings Card */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-md p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Total Earnings</p>
              <p className="text-4xl font-bold mt-1">${totalEarnings.toFixed(2)}</p>
              <p className="text-green-100 text-sm mt-2">
                {dayjs(dateStart).format('MMM D, YYYY')} - {dayjs(dateEnd).format('MMM D, YYYY')}
              </p>
            </div>
            <div className="text-green-100">
              <DollarSign className="w-16 h-16 opacity-50" />
            </div>
          </div>
        </div>

        {/* Routesheets List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Service Details</h2>
              <p className="text-sm text-gray-600 mt-1">
                {routesheets.length} {routesheets.length === 1 ? 'service' : 'services'} completed
              </p>
            </div>
            <button
              onClick={handlePrint}
              disabled={printLoading || routesheets.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Printer className="w-5 h-5" />
              <span className="hidden sm:inline">{printLoading ? 'Generating...' : 'Print'}</span>
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 mt-4">Loading services...</p>
            </div>
          ) : routesheets.length > 0 ? (
            <div className="max-h-[600px] overflow-y-auto">
              <div className="p-4 space-y-3">
                {routesheets.map((sheet) => {
                  // Normalize patient code - remove digits and dots
                  const normalizedPatientCd = sheet.patientCd
                    ?.replace(/\d/g, '') // Remove all digits
                    ?.replace(/\./g, '') // Remove all dots
                    ?.trim()

                  return (
                    <div
                      key={sheet.id}
                      className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-lg mb-1">
                            {normalizedPatientCd}
                          </p>
                          <p className="text-sm text-gray-600">{sheet.service}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">
                            ${parseFloat(sheet.estimatedPayment?.toString() || '0').toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-500 pt-2 border-t border-gray-200">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{dayjs(sheet.dosStart).format('MMM D, YYYY')}</span>
                        </div>
                        <div>
                          <span>{dayjs(sheet.dosStart).format('h:mm A')}</span>
                          <span className="ml-2 text-xs">({dayjs(sheet.dosStart).format('ddd')})</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium">No services found</p>
              <p className="text-gray-500 text-sm mt-2">
                Try adjusting your date range to see more results
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
