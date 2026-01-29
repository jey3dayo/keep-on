import { getServerCookie } from '@/lib/server/cookies'
import { formatDateKey, getDateKeyInTimeZone } from '@/lib/utils/date'

const DEFAULT_TIMEZONE_COOKIE_KEY = 'ko_tz'

const decodeCookieValue = (value: string | null): string | undefined => {
  if (!value) {
    return undefined
  }
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export async function getServerTimeZone(cookieKey: string = DEFAULT_TIMEZONE_COOKIE_KEY) {
  const timeZoneRaw = await getServerCookie(cookieKey)
  const timeZone = decodeCookieValue(timeZoneRaw)
  return timeZone || undefined
}

export async function getServerDateKey(options: { cookieKey?: string; date?: Date } = {}) {
  const { cookieKey = DEFAULT_TIMEZONE_COOKIE_KEY, date = new Date() } = options
  const timeZone = await getServerTimeZone(cookieKey)
  if (!timeZone) {
    return formatDateKey(date)
  }
  try {
    return getDateKeyInTimeZone(date, timeZone)
  } catch {
    return formatDateKey(date)
  }
}
