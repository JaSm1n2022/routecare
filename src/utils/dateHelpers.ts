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
