import { useEffect, useState } from 'react'

/**
 * Hook to get the user's locale preference
 * Can be extended to read from user settings/database in the future
 */
export function useLocale(): string {
  const [locale, setLocale] = useState<string>('en-US')

  useEffect(() => {
    // Get locale from browser settings
    const browserLocale = navigator.language || navigator.languages?.[0] || 'en-US'
    setLocale(browserLocale)

    // TODO: In the future, this could be extended to:
    // 1. Read from user preferences stored in database
    // 2. Read from cookie/localStorage for persistence
    // 3. Allow manual override via settings page
  }, [])

  return locale
}
