import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { getThisWeekDateRange, getThisMonthDateRange, getPayrollCutoffDateRange, formatDateForSupabase, calculateExpectedVisits } from '../utils/dateHelpers'
import dayjs from 'dayjs'

interface Assignment {
  id: string
  patientCd: string
  frequencyVisit: string
  visitType: string
  dayOfTheWeek: string[]
  timeOfVisit: string
  disciplineId: string
}

interface DashboardMetrics {
  assignedPatients: number
  scheduledVisits: number
  completedVisits: number
  estimatedPayment: number
  actualEarnings: number
  assignments: Assignment[]
  loading: boolean
  error: string | null
}

export function useDashboardMetrics(): DashboardMetrics {
  const { authUser, employee, profile, loading: authLoading } = useAuth()
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    assignedPatients: 0,
    scheduledVisits: 0,
    completedVisits: 0,
    estimatedPayment: 0,
    actualEarnings: 0,
    assignments: [],
    loading: true,
    error: null
  })

  useEffect(() => {
    // Safety timeout - if loading takes more than 5 seconds, something is wrong
    const safetyTimeout = setTimeout(() => {
      if (metrics.loading) {
        console.warn('⚠️ Dashboard metrics loading timeout - forcing stop')
        setMetrics(prev => ({
          ...prev,
          loading: false,
          error: 'Loading timeout - please refresh the page'
        }))
      }
    }, 5000)

    return () => clearTimeout(safetyTimeout)
  }, [metrics.loading])

  useEffect(() => {
    console.log('🔍 Dashboard Metrics Hook - State:', {
      authLoading,
      hasAuthUser: !!authUser,
      hasProfile: !!profile,
      hasEmployee: !!employee,
      employeeId: employee?.id,
      companyId: profile?.company_id || employee?.companyId,
      profileRole: profile?.role
    })

    // Wait for auth to finish loading before checking data
    if (authLoading) {
      console.log('⏳ Waiting for auth to finish loading...')
      setMetrics(prev => ({ ...prev, loading: true }))
      return
    }

    // If no authUser, user is not logged in
    if (!authUser) {
      console.log('❌ No authenticated user')
      setMetrics(prev => ({ ...prev, loading: false }))
      return
    }

    // Try both field name variations
    const companyId = profile?.company_id || profile?.companyId || employee?.companyId
    const employeeId = employee?.id

    console.log('🔍 Debug - Resolved IDs:', { companyId, employeeId })

    // If we don't have employee data yet, wait for it
    // (Even if profile fetch failed, we can work with employee data alone)
    if (!employee || !employeeId) {
      console.log('⏳ Waiting for employee data to load...')
      setMetrics(prev => ({ ...prev, loading: true }))
      return
    }

    // If we don't have company ID from anywhere, we can't proceed
    if (!companyId) {
      console.log('⚠️ Missing company_id', {
        profile_company_id: profile?.company_id,
        profile_companyId: profile?.companyId,
        employee_companyId: employee?.companyId,
        employee_id: employee?.id,
        authLoading,
        profileRole: profile?.role
      })
      setMetrics(prev => ({ ...prev, loading: false, error: 'Missing company information' }))
      return
    }

    console.log('✅ All data ready, fetching dashboard metrics...')
    fetchDashboardMetrics()
  }, [profile, employee, authLoading, authUser])

  async function fetchDashboardMetrics() {
    try {
      console.log('📊 Fetching dashboard metrics...')
      setMetrics(prev => ({ ...prev, loading: true, error: null }))

      // Get company ID from profile or employee
      const companyId = profile?.company_id || profile?.companyId || employee?.companyId
      const employeeId = employee?.id

      console.log('🔍 Query parameters:', {
        companyId,
        employeeId,
        profile,
        employee
      })

      if (!companyId || !employeeId) {
        throw new Error('Missing required IDs')
      }

      // Get date range based on employee position
      // MSW and Chaplain use monthly range
      // All other users use payroll cutoff period (11-25, 26-10)
      const employeePosition = employee?.position?.trim()
      const isMonthlyUser = employeePosition === 'MSW' || employeePosition === 'Chaplain'

      const dateRange = isMonthlyUser ? getThisMonthDateRange() : getPayrollCutoffDateRange()
      const fromDate = formatDateForSupabase(dateRange.from, '00:00')
      const toDate = formatDateForSupabase(dateRange.to, '23:59')

      console.log('📅 Date range:', {
        position: employeePosition,
        isMonthlyUser,
        rangeType: isMonthlyUser ? 'Monthly' : 'Payroll Cutoff',
        from: fromDate,
        to: toDate
      })

      console.log('🔍 Running queries with:', {
        table: 'assignments',
        companyId,
        disciplineId: employeeId
      })

      // Debug: Check what disciplineId values exist in assignments
      const { data: allAssignments, error: debugError } = await supabase
        .from('assignments')
        .select('disciplineId, patientCd')
        .eq('companyId', companyId)
        .limit(10)

      console.log('🔍 Debug - Sample assignments in company:', allAssignments)
      console.log('🔍 Debug - Looking for disciplineId:', employeeId, 'Type:', typeof employeeId)

      if (allAssignments && allAssignments.length > 0) {
        const disciplineIds = allAssignments.map(a => ({
          disciplineId: a.disciplineId,
          type: typeof a.disciplineId
        }))
        console.log('🔍 Debug - Existing disciplineIds in assignments:', disciplineIds)
      }

      // Determine date filter based on employee position
      // Chaplain: 365 days (except for non-bereavement)
      // All others: 30 days
      const isChaplain = employee?.position?.trim() === 'Chaplain'
      const daysAgo = isChaplain ? 365 : 30
      const filterDate = dayjs().subtract(daysAgo, 'day').format('YYYY-MM-DD')

      // Build assignments query
      let assignmentsQuery = supabase
        .from('assignments')
        .select('*')
        .eq('companyId', companyId)
        .eq('disciplineId', employeeId)
        .or(`eoc_dt.is.null,eoc_dt.gte.${filterDate}`)

      // For Chaplain, only show bereavement assignments (is_bereavement = true or null)
      if (isChaplain) {
        assignmentsQuery = assignmentsQuery.or('is_bereavement.is.null,is_bereavement.eq.true')
      }

      // Fetch all data in parallel
      const [assignmentsResult, routesheetsResult, contractsResult] = await Promise.all([
        // 1. Fetch assignments (assigned patients + scheduled visits)
        // Filter where eoc_dt is null OR eoc_dt is within the date range
        assignmentsQuery,

        // 2. Fetch routesheets (completed visits this week)
        supabase
          .from('routesheets')
          .select('*')
          .eq('companyId', companyId)
          .eq('requestorId', employeeId)
          .gte('dosStart', fromDate)
          .lt('dosStart', toDate),

        // 3. Fetch contracts (for payment calculations)
        supabase
          .from('contracts')
          .select('*')
          .eq('companyId', companyId)
      ])

      console.log('📦 Raw query results:', {
        assignmentsResult,
        routesheetsResult,
        contractsResult
      })

      // Handle errors
      if (assignmentsResult.error) {
        console.error('❌ Assignments query error:', assignmentsResult.error)
        throw assignmentsResult.error
      }
      if (routesheetsResult.error) {
        console.error('❌ Routesheets query error:', routesheetsResult.error)
        throw routesheetsResult.error
      }
      if (contractsResult.error) {
        console.error('❌ Contracts query error:', contractsResult.error)
        throw contractsResult.error
      }

      const assignments = assignmentsResult.data || []
      const routesheets = routesheetsResult.data || []
      const contracts = contractsResult.data || []

      console.log('✅ Data fetched:', {
        assignments: assignments.length,
        routesheets: routesheets.length,
        contracts: contracts.length
      })

      if (assignments.length > 0) {
        console.log('📋 Sample assignment:', assignments[0])
      }
      if (routesheets.length > 0) {
        console.log('📋 Sample routesheet:', routesheets[0])
      }
      if (contracts.length > 0) {
        console.log('📋 Sample contract:', contracts[0])
      }

      // Calculate metrics
      const assignedPatients = assignments.length

      // Calculate scheduled visits based on frequency, visitType, and date range
      const scheduledVisits = assignments.reduce((total, assignment) => {
        const expectedVisits = calculateExpectedVisits(
          assignment.frequencyVisit,
          assignment.visitType,
          dateRange.from,
          dateRange.to
        )
        return total + expectedVisits
      }, 0)

      // Completed visits = number of routesheets this week
      const completedVisits = routesheets.length

      // Calculate estimated payment
      let estimatedPayment = 0
      console.log('💰 Starting payment calculation with:', {
        employeeId,
        totalContracts: contracts.length,
        totalAssignments: assignments.length
      })

      assignments.forEach((assignment, index) => {
        // Calculate expected visits based on frequency, visitType, and date range
        const expectedVisits = calculateExpectedVisits(
          assignment.frequencyVisit,
          assignment.visitType,
          dateRange.from,
          dateRange.to
        )

        console.log(`\n📋 Assignment ${index + 1}:`, {
          patientCd: assignment.patientCd,
          visitType: assignment.visitType,
          frequencyVisit: assignment.frequencyVisit,
          dateRange: `${dateRange.from} to ${dateRange.to}`,
          expectedVisits
        })

        // Default service type is "Regular Visit" for assignments
        const serviceType = 'regular visit'

        // Step 1: Find patient-specific contract for Regular Visit + employee
        let contract = contracts.find(
          c => c.patientCd === assignment.patientCd?.toString() &&
               c.serviceType?.toLowerCase() === serviceType &&
               c.employeeId === employeeId
        )
        if (contract) console.log('✅ Found patient+employee contract:', contract)

        // Step 2: Find patient-specific contract for Regular Visit (any employee)
        if (!contract) {
          contract = contracts.find(
            c => c.patientCd === assignment.patientCd?.toString() &&
                 c.serviceType?.toLowerCase() === serviceType
          )
          if (contract) console.log('✅ Found patient-specific contract:', contract)
        }

        // Step 3: Find employee-specific Regular Visit contract (applies to all patients)
        if (!contract) {
          contract = contracts.find(
            c => !c.patientCd &&
                 c.serviceType?.toLowerCase() === serviceType &&
                 c.employeeId === employeeId
          )
          if (contract) console.log('✅ Found employee-specific Regular Visit contract (for all patients):', contract)
        }

        // Step 4: Find default Regular Visit contract (applies to all patients and employees)
        if (!contract) {
          contract = contracts.find(
            c => !c.patientCd &&
                 !c.employeeId &&
                 c.serviceType?.toLowerCase() === serviceType
          )
          if (contract) console.log('✅ Found default Regular Visit contract (for all):', contract)
        }

        if (!contract) {
          console.log('❌ No contract found for this assignment')
        }

        if (contract) {
          const lineTotal = contract.serviceRate * expectedVisits
          console.log(`💵 Adding to total: ${expectedVisits} visits × $${contract.serviceRate} = $${lineTotal}`)
          estimatedPayment += lineTotal
        }
      })

      console.log(`\n💰 Total estimated payment: $${estimatedPayment.toFixed(2)}`)


      // Calculate actual earnings (sum of estimatedPayment from completed routesheets)
      const actualEarnings = routesheets.reduce((total, sheet) => {
        return total + (parseFloat(sheet.estimatedPayment || '0'))
      }, 0)

      console.log('📈 Calculated metrics:', {
        assignedPatients,
        scheduledVisits,
        completedVisits,
        estimatedPayment: estimatedPayment.toFixed(2),
        actualEarnings: actualEarnings.toFixed(2)
      })

      setMetrics({
        assignedPatients,
        scheduledVisits,
        completedVisits,
        estimatedPayment,
        actualEarnings,
        assignments,
        loading: false,
        error: null
      })

    } catch (error: any) {
      console.error('❌ Error fetching dashboard metrics:', error)
      setMetrics(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to fetch metrics'
      }))
    }
  }

  return metrics
}
