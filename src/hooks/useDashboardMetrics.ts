import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { getThisWeekDateRange, formatDateForSupabase } from '../utils/dateHelpers'

interface DashboardMetrics {
  assignedPatients: number
  scheduledVisits: number
  completedVisits: number
  estimatedPayment: number
  actualEarnings: number
  loading: boolean
  error: string | null
}

export function useDashboardMetrics(): DashboardMetrics {
  const { authUser, employee, profile } = useAuth()
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    assignedPatients: 0,
    scheduledVisits: 0,
    completedVisits: 0,
    estimatedPayment: 0,
    actualEarnings: 0,
    loading: true,
    error: null
  })

  useEffect(() => {
    console.log('🔍 Debug - Profile:', profile)
    console.log('🔍 Debug - Employee:', employee)

    // Try both field name variations
    const companyId = profile?.company_id || profile?.companyId || employee?.companyId
    const employeeId = employee?.id

    console.log('🔍 Debug - Resolved IDs:', { companyId, employeeId })

    if (!companyId || !employeeId) {
      console.log('⚠️ Missing company_id or employee id', {
        profile_company_id: profile?.company_id,
        profile_companyId: profile?.companyId,
        employee_companyId: employee?.companyId,
        employee_id: employee?.id
      })
      setMetrics(prev => ({ ...prev, loading: false }))
      return
    }

    fetchDashboardMetrics()
  }, [profile, employee])

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

      // Get this week's date range
      const weekRange = getThisWeekDateRange()
      const fromDate = formatDateForSupabase(weekRange.from, '00:00')
      const toDate = formatDateForSupabase(weekRange.to, '23:59')

      console.log('📅 Week range:', { from: fromDate, to: toDate })

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

      // Fetch all data in parallel
      const [assignmentsResult, routesheetsResult, contractsResult] = await Promise.all([
        // 1. Fetch assignments (assigned patients + scheduled visits)
        supabase
          .from('assignments')
          .select('*')
          .eq('companyId', companyId)
          .eq('disciplineId', employeeId),

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

      // Calculate scheduled visits (sum of frequencyVisit from assignments)
      const scheduledVisits = assignments.reduce((total, assignment) => {
        return total + (parseInt(assignment.frequencyVisit || '0'))
      }, 0)

      // Completed visits = number of routesheets this week
      const completedVisits = routesheets.length

      // Calculate estimated payment
      let estimatedPayment = 0
      assignments.forEach(assignment => {
        // Find matching contract for this patient
        let contract = contracts.find(
          c => c.patientCd === assignment.patientCd?.toString() &&
               c.serviceType?.toLowerCase() === 'regular visit'
        )

        // If no patient-specific contract, use default "regular visit" rate
        if (!contract) {
          contract = contracts.find(c => c.serviceType?.toLowerCase() === 'regular visit')
        }

        if (contract) {
          const visits = parseInt(assignment.frequencyVisit || '0')
          estimatedPayment += contract.serviceRate * visits
        }
      })

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
