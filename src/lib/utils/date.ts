import { type DayStartHour, DEFAULT_DAY_START_HOUR, isDayStartHour } from '@/constants/habit'

const DATE_KEY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/
const DAY_NAMES_JA = ['日', '月', '火', '水', '木', '金', '土']
const MS_PER_HOUR = 60 * 60 * 1000

export function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDateLabel(date: Date, timeZone?: string): string {
  try {
    const parts = new Intl.DateTimeFormat('ja-JP', {
      day: 'numeric',
      month: 'numeric',
      timeZone,
      weekday: 'short',
    }).formatToParts(date)

    const month = parts.find((part) => part.type === 'month')?.value
    const day = parts.find((part) => part.type === 'day')?.value
    const weekday = parts.find((part) => part.type === 'weekday')?.value

    if (month && day && weekday) {
      return `${month}月${day}日（${weekday}）`
    }
  } catch {
    // Fallback to local date below.
  }

  return `${date.getMonth() + 1}月${date.getDate()}日（${DAY_NAMES_JA[date.getDay()]}）`
}

export function parseDateKey(dateKey: string): Date {
  const match = DATE_KEY_REGEX.exec(dateKey)
  if (!match) {
    return new Date(dateKey)
  }
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  return new Date(year, month, day)
}

export function getDateKeyInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone,
    year: 'numeric',
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  if (!(year && month && day)) {
    return formatDateKey(date)
  }

  return `${year}-${month}-${day}`
}

/**
 * dayStartHour を考慮した dateKey を算出する。日付境界の計算はこの関数に一本化する。
 *
 * `dayStartHour - 24` 時間ぶんの実時間（DST を跨いでも一定の duration）を instant から
 * 減算し、その結果をタイムゾーンの暦日として解決する。dayStartHour = 24 のときは
 * オフセットが 0 になるため、既存の（オフセットなしの）dateKey 算出と完全に一致する。
 *
 * @param instant - 基準となる瞬間（操作時刻など）
 * @param dayStartHour - 日付が切り替わる時刻（24〜29）
 * @param timeZone - 省略時はローカルタイムゾーンの暦日を使う
 */
export function getDateKeyWithDayStart(instant: Date, dayStartHour: DayStartHour, timeZone?: string): string {
  // 型上は DayStartHour だが、KV キャッシュなど JSON を経由した値は実行時に型を保証できない。
  // 不正値が漏れてもクラッシュせず暦どおりの挙動へ落とす最終防衛線
  const safeDayStartHour = isDayStartHour(dayStartHour) ? dayStartHour : DEFAULT_DAY_START_HOUR
  const offsetMs = (safeDayStartHour - 24) * MS_PER_HOUR
  const adjusted = new Date(instant.getTime() - offsetMs)
  if (!timeZone) {
    return formatDateKey(adjusted)
  }
  try {
    return getDateKeyInTimeZone(adjusted, timeZone)
  } catch {
    return formatDateKey(adjusted)
  }
}

export function normalizeDateKey(input: Date | string, timeZone?: string): string {
  if (typeof input === 'string') {
    return input
  }
  return timeZone ? getDateKeyInTimeZone(input, timeZone) : formatDateKey(input)
}

export function normalizeCheckinDate(value: Date | string): Date {
  if (value instanceof Date) {
    const isLocalMidnight =
      value.getHours() === 0 && value.getMinutes() === 0 && value.getSeconds() === 0 && value.getMilliseconds() === 0
    if (isLocalMidnight) {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate())
    }
    return new Date(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
  }

  const match = DATE_KEY_REGEX.exec(value)
  if (match) {
    const year = Number(match[1])
    const month = Number(match[2]) - 1
    const day = Number(match[3])
    return new Date(year, month, day)
  }

  const parsed = new Date(value)
  return new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate())
}
