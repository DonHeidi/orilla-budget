/**
 * Format a date string to a localized date (without time)
 * @param dateString - ISO date string or date string
 * @param locale - BCP 47 language tag (e.g., 'en-US', 'de-DE', 'fr-FR')
 * @returns Formatted date string
 */
export function formatDate(dateString: string, locale = 'en-US'): string {
  const date = new Date(dateString)
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
  return date.toLocaleDateString(locale, options)
}

/**
 * Format a datetime string to a localized date and time
 * @param isoString - ISO datetime string
 * @param locale - BCP 47 language tag (e.g., 'en-US', 'de-DE', 'fr-FR')
 * @returns Formatted datetime string
 */
export function formatDateTime(isoString: string, locale = 'en-US'): string {
  const date = new Date(isoString)
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: locale.startsWith('en'), // Use 12-hour format for English locales
  }
  return date.toLocaleString(locale, options)
}

/**
 * Convert decimal hours to h:mm format
 * @param hours - Decimal hours (e.g., 2.5 = 2h 30m)
 * @returns Formatted time string (e.g., "2:30")
 */
export function hoursToTime(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}:${m.toString().padStart(2, '0')}`
}

/**
 * Convert h:mm format to decimal hours
 * @param time - Time string in h:mm format (e.g., "2:30")
 * @returns Decimal hours (e.g., 2.5)
 */
export function timeToHours(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours + (minutes || 0) / 60
}
