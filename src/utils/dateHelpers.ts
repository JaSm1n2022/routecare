/**
 * Get the start and end dates for the current week (Monday to Sunday)
 * @returns {from: string, to: string} - Dates in MM/DD/YYYY format
 */
export function getThisWeekDateRange(): { from: string; to: string } {
  const now = new Date()

  // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dayOfWeek = now.getDay()

  // Calculate days to subtract to get to Monday (start of week)
  // If today is Sunday (0), go back 6 days; if Monday (1), go back 0 days, etc.
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  // Get Monday of this week
  const monday = new Date(now)
  monday.setDate(now.getDate() - daysToMonday)
  monday.setHours(0, 0, 0, 0)

  // Get Sunday of this week
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  return {
    from: formatDate(monday),
    to: formatDate(sunday)
  }
}

/**
 * Format date to MM/DD/YYYY format (required by backend)
 */
function formatDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = date.getFullYear()

  return `${month}/${day}/${year}`
}

/**
 * Get the start and end dates for the current month
 * @returns {from: string, to: string} - Dates in MM/DD/YYYY format
 */
export function getThisMonthDateRange(): { from: string; to: string } {
  const now = new Date()

  // Get first day of the month
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  firstDay.setHours(0, 0, 0, 0)

  // Get last day of the month
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  lastDay.setHours(23, 59, 59, 999)

  return {
    from: formatDate(firstDay),
    to: formatDate(lastDay)
  }
}

/**
 * Get the start and end dates for the current payroll period
 * Payroll periods: 11th-25th and 26th-10th
 * @returns {from: string, to: string} - Dates in MM/DD/YYYY format
 */
export function getPayrollCutoffDateRange(): { from: string; to: string } {
  const now = new Date()
  const currentDay = now.getDate()

  let startDate: Date
  let endDate: Date

  if (currentDay >= 26) {
    // We're in the 26th-10th period
    // Start: 26th of current month
    startDate = new Date(now.getFullYear(), now.getMonth(), 26)
    startDate.setHours(0, 0, 0, 0)

    // End: 10th of next month
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 10)
    endDate.setHours(23, 59, 59, 999)
  } else if (currentDay >= 11) {
    // We're in the 11th-25th period
    // Start: 11th of current month
    startDate = new Date(now.getFullYear(), now.getMonth(), 11)
    startDate.setHours(0, 0, 0, 0)

    // End: 25th of current month
    endDate = new Date(now.getFullYear(), now.getMonth(), 25)
    endDate.setHours(23, 59, 59, 999)
  } else {
    // We're in the 1st-10th period (end of previous payroll period)
    // Start: 26th of previous month
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 26)
    startDate.setHours(0, 0, 0, 0)

    // End: 10th of current month
    endDate = new Date(now.getFullYear(), now.getMonth(), 10)
    endDate.setHours(23, 59, 59, 999)
  }

  return {
    from: formatDate(startDate),
    to: formatDate(endDate)
  }
}

/**
 * Get the formatted payroll period display string
 * @returns string - e.g., "06/26/2026 to 07/10/2026"
 */
export function getPayrollPeriodDisplay(): string {
  const { from, to } = getPayrollCutoffDateRange()
  return `${from} to ${to}`
}

/**
 * Get the start and end dates for today
 */
export function getTodayDateRange(): { from: string; to: string } {
  const now = new Date()
  return {
    from: formatDate(now),
    to: formatDate(now)
  }
}

/**
 * Format date for Supabase timestamp queries (YYYY-MM-DD HH:MM format)
 */
export function formatDateForSupabase(dateString: string, time: string = '00:00'): string {
  // Convert MM/DD/YYYY to YYYY-MM-DD
  const [month, day, year] = dateString.split('/')
  return `${year}-${month}-${day} ${time}`
}

/**
 * Calculate the number of expected visits based on frequency and date range
 * @param frequencyVisit - Number of visits (e.g., "1", "2", "3")
 * @param visitType - Type of visit period ("week" or "month")
 * @param fromDate - Start date in MM/DD/YYYY format
 * @param toDate - End date in MM/DD/YYYY format
 * @returns number - Total expected visits in the date range
 */
export function calculateExpectedVisits(
  frequencyVisit: string | number,
  visitType: string,
  fromDate: string,
  toDate: string
): number {
  const frequency = parseInt(String(frequencyVisit)) || 0
  if (frequency === 0) return 0

  // Parse dates (MM/DD/YYYY format)
  const parseDate = (dateStr: string): Date => {
    const [month, day, year] = dateStr.split('/')
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  }

  const startDate = parseDate(fromDate)
  const endDate = parseDate(toDate)

  // Calculate the number of days in the range
  const millisecondsPerDay = 1000 * 60 * 60 * 24
  const daysInRange = Math.ceil((endDate.getTime() - startDate.getTime()) / millisecondsPerDay) + 1

  const normalizedVisitType = visitType.toLowerCase().trim()

  if (normalizedVisitType === 'week') {
    // Calculate number of complete weeks + partial week
    const weeks = daysInRange / 7
    return Math.ceil(weeks * frequency)
  } else if (normalizedVisitType === 'month') {
    // Calculate number of months (approximate)
    const months = daysInRange / 30.44 // Average days in a month
    return Math.ceil(months * frequency)
  }

  // If visitType is not recognized, return the frequency as-is
  return frequency
}
