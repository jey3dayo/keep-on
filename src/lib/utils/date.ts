const DATE_KEY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/

export function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
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
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  if (!(year && month && day)) {
    return formatDateKey(date)
  }

  return `${year}-${month}-${day}`
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
