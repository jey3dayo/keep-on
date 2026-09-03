import { type DayStartHour, DEFAULT_DAY_START_HOUR } from '@/constants/habit'
import { getServerCookie } from '@/lib/server/cookies'
import { getDateKeyWithDayStart } from '@/lib/utils/date'

const DEFAULT_TIMEZONE_COOKIE_KEY = 'ko_tz'

const decodeCookieValue = (value: string | null): string | undefined => {
  if (!value) {
    return
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

/**
 * @param options.dayStartHour - 日付が切り替わる時刻。呼び出し元がユーザーの設定を渡さない場合は
 *   暦どおり（24）にフォールバックする
 */
export async function getServerDateKey(options: { cookieKey?: string; date?: Date; dayStartHour?: DayStartHour } = {}) {
  const { cookieKey = DEFAULT_TIMEZONE_COOKIE_KEY, date = new Date(), dayStartHour = DEFAULT_DAY_START_HOUR } = options
  const timeZone = await getServerTimeZone(cookieKey)
  return getDateKeyWithDayStart(date, dayStartHour, timeZone)
}
