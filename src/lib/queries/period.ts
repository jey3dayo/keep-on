import { endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek } from 'date-fns'
import type { Period, WeekStartDay } from '@/constants/habit'
import { formatDateKey, parseDateKey } from '@/lib/utils/date'

function getPeriodStart(date: Date, period: Period, weekStartDay: WeekStartDay = 1): Date {
  switch (period) {
    case 'daily':
      return startOfDay(date)
    case 'weekly':
      return startOfWeek(date, { weekStartsOn: weekStartDay })
    case 'monthly':
      return startOfMonth(date)
    default:
      return startOfDay(date)
  }
}

function getPeriodEnd(date: Date, period: Period, weekStartDay: WeekStartDay = 1): Date {
  switch (period) {
    case 'daily':
      return endOfDay(date)
    case 'weekly':
      return endOfWeek(date, { weekStartsOn: weekStartDay })
    case 'monthly':
      return endOfMonth(date)
    default:
      return endOfDay(date)
  }
}

/**
 * 指定期間の開始/終了日と日付キーを返す
 */
export function getPeriodDateRange(
  date: Date | string,
  period: Period,
  weekStartDay: WeekStartDay = 1
): { start: Date; end: Date; startKey: string; endKey: string } {
  const baseDate = typeof date === 'string' ? parseDateKey(date) : date
  const start = getPeriodStart(baseDate, period, weekStartDay)
  const end = getPeriodEnd(baseDate, period, weekStartDay)

  return {
    start,
    end,
    startKey: formatDateKey(start),
    endKey: formatDateKey(end),
  }
}
