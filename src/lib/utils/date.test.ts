import { describe, expect, it } from 'vitest'
import type { DayStartHour } from '@/constants/habit'
import { formatDateKey, getDateKeyInTimeZone, getDateKeyWithDayStart } from './date'

describe('getDateKeyWithDayStart', () => {
  it('dayStartHour = 24 のとき、既存のタイムゾーンなし dateKey 算出と完全に一致する', () => {
    const instant = new Date('2026-09-02T16:30:00.000Z') // UTC のまま扱う（timeZone 省略）
    expect(getDateKeyWithDayStart(instant, 24)).toBe(formatDateKey(instant))
  })

  it('dayStartHour = 24 のとき、既存のタイムゾーンあり dateKey 算出と完全に一致する', () => {
    const instant = new Date('2026-09-02T16:30:00.000Z')
    const timeZone = 'Asia/Tokyo'
    expect(getDateKeyWithDayStart(instant, 24, timeZone)).toBe(getDateKeyInTimeZone(instant, timeZone))
  })

  describe('dayStartHour = 26（2:00 が境界）', () => {
    const dayStartHour: DayStartHour = 26
    const timeZone = 'Asia/Tokyo'

    it('01:30 は前日として扱う', () => {
      // 2026-09-02 01:30 JST
      const instant = new Date('2026-09-01T16:30:00.000Z')
      expect(getDateKeyWithDayStart(instant, dayStartHour, timeZone)).toBe('2026-09-01')
    })

    it('境界の 02:00 ちょうどは当日として扱う', () => {
      // 2026-09-02 02:00 JST
      const instant = new Date('2026-09-01T17:00:00.000Z')
      expect(getDateKeyWithDayStart(instant, dayStartHour, timeZone)).toBe('2026-09-02')
    })
  })

  describe('dayStartHour = 29（5:00 が境界）', () => {
    const dayStartHour: DayStartHour = 29
    const timeZone = 'Asia/Tokyo'

    it('04:59 は前日として扱う', () => {
      // 2026-09-02 04:59 JST
      const instant = new Date('2026-09-01T19:59:00.000Z')
      expect(getDateKeyWithDayStart(instant, dayStartHour, timeZone)).toBe('2026-09-01')
    })

    it('境界の 05:00 ちょうどは当日として扱う', () => {
      // 2026-09-02 05:00 JST
      const instant = new Date('2026-09-01T20:00:00.000Z')
      expect(getDateKeyWithDayStart(instant, dayStartHour, timeZone)).toBe('2026-09-02')
    })
  })

  it('タイムゾーンを跨いでもオフセットが正しく効く（America/New_York, dayStartHour=26）', () => {
    const timeZone = 'America/New_York'
    // 2026-01-15 01:30 America/New_York (EST, UTC-5) = 06:30 UTC
    const beforeBoundary = new Date('2026-01-15T06:30:00.000Z')
    // 2026-01-15 02:00 America/New_York = 07:00 UTC
    const atBoundary = new Date('2026-01-15T07:00:00.000Z')

    expect(getDateKeyWithDayStart(beforeBoundary, 26, timeZone)).toBe('2026-01-14')
    expect(getDateKeyWithDayStart(atBoundary, 26, timeZone)).toBe('2026-01-15')
  })

  it('DST切替日（America/New_Yorkの春時刻: 2026-03-08 02:00 が 03:00 へ飛ぶ）でも境界判定が破綻しない', () => {
    const timeZone = 'America/New_York'
    // 2026-03-08 01:30 EST (UTC-5) = 06:30 UTC。dayStartHour=26 の境界(2:00)より前なので前日扱い
    const beforeBoundary = new Date('2026-03-08T06:30:00.000Z')
    // DST切替により 2026-03-08 02:00 という壁時計時刻は存在しない。切替後の 03:30 EDT (UTC-4) は
    // 07:30 UTC。dayStartHour=26 の境界を過ぎているため当日扱いになる
    const afterSpringForward = new Date('2026-03-08T07:30:00.000Z')

    expect(getDateKeyWithDayStart(beforeBoundary, 26, timeZone)).toBe('2026-03-07')
    expect(getDateKeyWithDayStart(afterSpringForward, 26, timeZone)).toBe('2026-03-08')
  })

  it('DST切替日（America/New_Yorkの秋時刻: 2026-11-01 02:00 が 01:00 へ戻る）でも境界判定が破綻しない', () => {
    const timeZone = 'America/New_York'
    // instant から実時間で 5 時間（dayStartHour=29 のオフセット）を引いてからタイムゾーンの
    // 暦日を求める仕様のため、フォールバックで 1 時間分の壁時計が重複するこの日は
    // 「ローカル時刻が 05:00 未満なら前日」という単純な読み替えにはならない。
    // 2026-11-01T08:45:00.000Z（ローカル 03:45 EST。06:00Z に EST へ戻っているため）は前日の日付になる
    const beforeBoundary = new Date('2026-11-01T08:45:00.000Z')
    // 2026-11-01T09:00:00.000Z（ローカル 04:00 EDT）から当日の日付に切り替わる
    const atBoundary = new Date('2026-11-01T09:00:00.000Z')

    expect(getDateKeyWithDayStart(beforeBoundary, 29, timeZone)).toBe('2026-10-31')
    expect(getDateKeyWithDayStart(atBoundary, 29, timeZone)).toBe('2026-11-01')
  })

  it('不正な dayStartHour（型を迂回して渡った値）は DEFAULT_DAY_START_HOUR(24) と同じ結果になる', () => {
    const instant = new Date('2026-09-02T16:30:00.000Z')
    const timeZone = 'Asia/Tokyo'
    // KV キャッシュの JSON パース漏れ等で undefined/0 のような値が実行時に渡るケースの防御を検証する。
    // 型システム上は起こらないため、テストに限り unknown 経由でキャストする
    const invalidValues = [undefined, 0] as unknown as DayStartHour[]

    for (const invalid of invalidValues) {
      expect(getDateKeyWithDayStart(instant, invalid, timeZone)).toBe(getDateKeyWithDayStart(instant, 24, timeZone))
    }
  })
})
