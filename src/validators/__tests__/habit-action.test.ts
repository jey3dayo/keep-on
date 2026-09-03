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

  describe('occurredAt が渡された場合', () => {
    // dayStartHour=26（2:00 が境界）、Asia/Tokyo。01:30 はまだ前日（09-01）として記録される
    const context = { dayStartHour: 26 as const, timeZone: 'Asia/Tokyo' }
    // 2026-09-02 01:30 JST = 2026-09-01T16:30:00.000Z
    const occurredAt = '2026-09-01T16:30:00.000Z'
    // その瞬間のサーバー基準日（getServerDateKey が同じ dayStartHour で算出した値）
    const boundaryTodayKey = '2026-09-01'

    it('dateKeyより優先して採用される', () => {
      // クライアントは暦どおりの当日（09-02）を dateKey として送ってくる想定
      const result = validateHabitActionInput({ dateKey: '2026-09-02', habitId, occurredAt }, boundaryTodayKey, context)

      expect(Result.isSuccess(result)).toBe(true)
      if (Result.isSuccess(result)) {
        expect(result.value).toEqual({ dateKey: '2026-09-01', habitId })
      }
    })

    it('境界直後でクライアントの dateKey と導出結果が割れても許容ウィンドウで弾かれない', () => {
      const result = validateHabitActionInput({ dateKey: '2026-09-02', habitId, occurredAt }, boundaryTodayKey, context)

      expect(Result.isSuccess(result)).toBe(true)
    })

    it('dateKey省略でoccurredAtのみでも導出される', () => {
      const result = validateHabitActionInput({ habitId, occurredAt }, boundaryTodayKey, context)

      expect(Result.isSuccess(result)).toBe(true)
      if (Result.isSuccess(result)) {
        expect(result.value.dateKey).toBe('2026-09-01')
      }
    })

    it('不正なoccurredAtはValidationErrorを返す', () => {
      const result = validateHabitActionInput({ habitId, occurredAt: 'not-a-timestamp' }, boundaryTodayKey, context)

      expect(Result.isFailure(result)).toBe(true)
      if (Result.isFailure(result)) {
        expect(result.error).toBeInstanceOf(ValidationError)
        expect(result.error.field).toBe('occurredAt')
      }
    })

    it('導出後のdateKeyが許容ウィンドウ外ならValidationErrorを返す', () => {
      // todayKey を occurredAt 由来の日付（09-01）より2日前にする → 導出後の判定で未来2日として弾かれる
      const result = validateHabitActionInput({ habitId, occurredAt }, '2026-08-30', context)

      expect(Result.isFailure(result)).toBe(true)
      if (Result.isFailure(result)) {
        expect(result.error).toBeInstanceOf(ValidationError)
        expect(result.error.field).toBe('occurredAt')
      }
    })

    it('context省略時はoccurredAtを無視し従来どおりdateKey/todayKeyで解決する', () => {
      const result = validateHabitActionInput({ dateKey: '2026-08-14', habitId, occurredAt }, todayKey)

      expect(Result.isSuccess(result)).toBe(true)
      if (Result.isSuccess(result)) {
        expect(result.value.dateKey).toBe('2026-08-14')
      }
    })

    it('操作時点のタイムゾーンでdateKeyを導出する', () => {
      const checkinOccurredAt = '2026-03-01T15:30:00.000Z'
      const tokyoResult = validateHabitActionInput(
        { dateKey: '2026-03-01', habitId, occurredAt: checkinOccurredAt, timeZone: 'Asia/Tokyo' },
        '2026-03-01',
        { dayStartHour: 24, timeZone: 'UTC' }
      )
      const losAngelesResult = validateHabitActionInput(
        { dateKey: '2026-03-01', habitId, occurredAt: checkinOccurredAt, timeZone: 'America/Los_Angeles' },
        '2026-03-01',
        { dayStartHour: 24, timeZone: 'UTC' }
      )

      expect(Result.isSuccess(tokyoResult)).toBe(true)
      expect(Result.isSuccess(losAngelesResult)).toBe(true)
      if (Result.isSuccess(tokyoResult) && Result.isSuccess(losAngelesResult)) {
        expect(tokyoResult.value.dateKey).toBe('2026-03-02')
        expect(losAngelesResult.value.dateKey).toBe('2026-03-01')
      }
    })

    it('不正なタイムゾーンはValidationErrorを返す', () => {
      const result = validateHabitActionInput(
        { habitId, occurredAt: '2026-03-01T15:30:00.000Z', timeZone: 'Not/AZone' },
        '2026-03-01',
        { dayStartHour: 24, timeZone: 'Asia/Tokyo' }
      )

      expect(Result.isFailure(result)).toBe(true)
      if (Result.isFailure(result)) {
        expect(result.error).toBeInstanceOf(ValidationError)
        expect(result.error.field).toBe('timeZone')
        expect(result.error.reason).toBe('Invalid timeZone')
      }
    })

    it('cookie由来の不正なcontext.timeZoneでも失敗せずdateKeyを返す', () => {
      const result = validateHabitActionInput({ habitId, occurredAt: '2026-03-01T15:30:00.000Z' }, '2026-03-01', {
        dayStartHour: 24,
        timeZone: 'Not/AZone',
      })

      expect(Result.isSuccess(result)).toBe(true)
      if (Result.isSuccess(result)) {
        expect(result.value.habitId).toBe(habitId)
        expect(result.value.dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      }
    })
  })
})
