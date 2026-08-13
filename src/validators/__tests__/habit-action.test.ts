import { Result } from '@praha/byethrow'
import { describe, expect, it } from 'vitest'
import { ValidationError } from '@/lib/errors/habit'
import { isDateKeyWithinWindow, validateHabitActionInput } from '../habit-action'

describe('isDateKeyWithinWindow', () => {
  const todayKey = '2026-08-13'

  it('当日は許容範囲内', () => {
    expect(isDateKeyWithinWindow('2026-08-13', todayKey)).toBe(true)
  })

  it('+1日（クロックスキュー許容）は許容範囲内', () => {
    expect(isDateKeyWithinWindow('2026-08-14', todayKey)).toBe(true)
  })

  it('+2日は許容範囲外', () => {
    expect(isDateKeyWithinWindow('2026-08-15', todayKey)).toBe(false)
  })

  it('-365日（オフライン再送許容の境界）は許容範囲内', () => {
    expect(isDateKeyWithinWindow('2025-08-13', todayKey)).toBe(true)
  })

  it('-366日は許容範囲外', () => {
    expect(isDateKeyWithinWindow('2025-08-12', todayKey)).toBe(false)
  })
})

describe('validateHabitActionInput', () => {
  const habitId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  const todayKey = '2026-08-13'

  it('dateKey省略時はtodayKeyで解決される', () => {
    const result = validateHabitActionInput({ habitId }, todayKey)

    expect(Result.isSuccess(result)).toBe(true)
    if (Result.isSuccess(result)) {
      expect(result.value).toEqual({ dateKey: todayKey, habitId })
    }
  })

  it('未来1日以内のdateKeyは成功する', () => {
    const result = validateHabitActionInput({ dateKey: '2026-08-14', habitId }, todayKey)

    expect(Result.isSuccess(result)).toBe(true)
  })

  it('未来2日以上のdateKeyはValidationErrorを返す', () => {
    const result = validateHabitActionInput({ dateKey: '2026-08-15', habitId }, todayKey)

    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect(result.error).toBeInstanceOf(ValidationError)
      expect(result.error.field).toBe('dateKey')
    }
  })

  it('366日以上過去のdateKeyはValidationErrorを返す', () => {
    const result = validateHabitActionInput({ dateKey: '2025-08-12', habitId }, todayKey)

    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect(result.error).toBeInstanceOf(ValidationError)
      expect(result.error.field).toBe('dateKey')
    }
  })

  it('不正な形式のdateKeyはValidationErrorを返す', () => {
    const result = validateHabitActionInput({ dateKey: 'not-a-date', habitId }, todayKey)

    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect(result.error).toBeInstanceOf(ValidationError)
      expect(result.error.field).toBe('dateKey')
    }
  })
})
