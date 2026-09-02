import { describe, expect, it } from 'vitest'
import { DAY_START_HOURS, DEFAULT_DAY_START_HOUR, isDayStartHour } from './habit'

describe('isDayStartHour', () => {
  it.each(DAY_START_HOURS)('%i はDayStartHourとして妥当', (value) => {
    expect(isDayStartHour(value)).toBe(true)
  })

  it.each([0, 1, 23, 30, 100, -1, 24.5])('%s はDayStartHourとして不正', (value) => {
    expect(isDayStartHour(value)).toBe(false)
  })
})

describe('DEFAULT_DAY_START_HOUR', () => {
  it('デフォルトは暦どおりの24時', () => {
    expect(DEFAULT_DAY_START_HOUR).toBe(24)
  })
})
