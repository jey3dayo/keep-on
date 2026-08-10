import { describe, expect, it } from 'vitest'
import { calculateStreakFromCheckins, type HabitSchedule } from '../habit-read'

const dailyHabit = (frequency = 1): HabitSchedule => ({
  frequency,
  id: 'habit-daily',
  period: 'daily',
})

const weeklyHabit = (frequency = 1): HabitSchedule => ({
  frequency,
  id: 'habit-weekly',
  period: 'weekly',
})

const monthlyHabit = (frequency = 1): HabitSchedule => ({
  frequency,
  id: 'habit-monthly',
  period: 'monthly',
})

// 実行時フォールバックの検証用。DB由来の不正値（period/frequency）は型で表現できないため、
// このファイル内で唯一の型境界としてここに集約する。
// 本番コードの normalizeHabitSchedule が period を unknown として受けるのと同じ理由。
function invalidSchedule(input: { frequency: number; id: string; period: string }): HabitSchedule {
  return input as HabitSchedule
}

describe('calculateStreakFromCheckins', () => {
  const baseDate = new Date('2026-03-15T00:00:00Z')

  it('checkinsもskipsも空のとき0を返す', () => {
    const streak = calculateStreakFromCheckins(dailyHabit(), [], 1, baseDate, [])
    expect(streak).toBe(0)
  })

  it('基準日を含む3日連続のチェックインで3を返す', () => {
    const checkins = [{ date: '2026-03-15' }, { date: '2026-03-14' }, { date: '2026-03-13' }]
    const streak = calculateStreakFromCheckins(dailyHabit(), checkins, 1, baseDate, [])
    expect(streak).toBe(3)
  })

  it('基準日にチェックインが無く前日から2日連続のとき2を返す（1期間巻き戻る）', () => {
    const checkins = [{ date: '2026-03-14' }, { date: '2026-03-13' }]
    const streak = calculateStreakFromCheckins(dailyHabit(), checkins, 1, baseDate, [])
    expect(streak).toBe(2)
  })

  it('2日連続のあと1日空いてさらに2日連続のとき、途切れた時点で止まり2を返す', () => {
    const checkins = [{ date: '2026-03-15' }, { date: '2026-03-14' }, { date: '2026-03-12' }, { date: '2026-03-11' }]
    const streak = calculateStreakFromCheckins(dailyHabit(), checkins, 1, baseDate, [])
    expect(streak).toBe(2)
  })

  it('同じ日付のチェックインが2件あっても観測された挙動をそのまま固定する', () => {
    const checkins = [{ date: '2026-03-15' }, { date: '2026-03-15' }]
    const streak = calculateStreakFromCheckins(dailyHabit(), checkins, 1, baseDate, [])
    expect(streak).toBe(1)
  })

  it('frequency=3で各日3件ずつ2日連続のとき2を返す', () => {
    const checkins = [
      { date: '2026-03-15' },
      { date: '2026-03-15' },
      { date: '2026-03-15' },
      { date: '2026-03-14' },
      { date: '2026-03-14' },
      { date: '2026-03-14' },
    ]
    const streak = calculateStreakFromCheckins(dailyHabit(3), checkins, 1, baseDate, [])
    expect(streak).toBe(2)
  })

  it('frequency=3で基準日が2件（未達）、前日が3件のとき1を返す', () => {
    const checkins = [
      { date: '2026-03-15' },
      { date: '2026-03-15' },
      { date: '2026-03-14' },
      { date: '2026-03-14' },
      { date: '2026-03-14' },
    ]
    const streak = calculateStreakFromCheckins(dailyHabit(3), checkins, 1, baseDate, [])
    expect(streak).toBe(1)
  })

  it('frequency=3で各日5件（超過）×2日のとき、超過しても1期間1カウントで2を返す', () => {
    const checkins = [
      { date: '2026-03-15' },
      { date: '2026-03-15' },
      { date: '2026-03-15' },
      { date: '2026-03-15' },
      { date: '2026-03-15' },
      { date: '2026-03-14' },
      { date: '2026-03-14' },
      { date: '2026-03-14' },
      { date: '2026-03-14' },
      { date: '2026-03-14' },
    ]
    const streak = calculateStreakFromCheckins(dailyHabit(3), checkins, 1, baseDate, [])
    expect(streak).toBe(2)
  })

  it('weekly/weekStartDay=1（月曜始まり）で直近3週にそれぞれ1件のとき3を返す', () => {
    const checkins = [{ date: '2026-03-11' }, { date: '2026-03-04' }, { date: '2026-02-25' }]
    const streak = calculateStreakFromCheckins(weeklyHabit(), checkins, 1, baseDate, [])
    expect(streak).toBe(3)
  })

  it('weekStartDayを変えると週境界の切り替わりで結果が変わる', () => {
    // 2026-03-08と2026-03-11の2件のチェックインに対して、weekStartDay=1（月曜始まり）と
    // weekStartDay=0（日曜始まり）で週の境界の引かれ方が変わり、
    // どの期間に何件のチェックインが属するかが変わるため、最終的なストリーク数も変わる。
    // 期待値は実際に動かして観測した値（1 と 2）をそのまま固定する。
    const checkins = [{ date: '2026-03-11' }, { date: '2026-03-08' }]
    const streakMondayStart = calculateStreakFromCheckins(weeklyHabit(), checkins, 1, baseDate, [])
    const streakSundayStart = calculateStreakFromCheckins(weeklyHabit(), checkins, 0, baseDate, [])
    expect(streakMondayStart).toBe(2)
    expect(streakSundayStart).toBe(1)
  })

  it('monthlyで直近2か月にそれぞれ1件のとき2を返す', () => {
    const checkins = [{ date: '2026-03-01' }, { date: '2026-02-01' }]
    const streak = calculateStreakFromCheckins(monthlyHabit(), checkins, 1, baseDate, [])
    expect(streak).toBe(2)
  })

  it('periodに不正値を渡すとDEFAULT_HABIT_PERIOD（daily）へフォールバックする', () => {
    const invalidPeriodHabit = invalidSchedule({ frequency: 1, id: 'habit-invalid-period', period: 'yearly' })
    const checkins = [{ date: '2026-03-15' }, { date: '2026-03-14' }]
    const streak = calculateStreakFromCheckins(invalidPeriodHabit, checkins, 1, baseDate, [])
    expect(streak).toBe(2)
  })

  it('frequencyに0を渡すと1として扱われる', () => {
    const zeroFrequencyHabit: HabitSchedule = { frequency: 0, id: 'habit-zero-frequency', period: 'daily' }
    const checkins = [{ date: '2026-03-15' }, { date: '2026-03-14' }]
    const streak = calculateStreakFromCheckins(zeroFrequencyHabit, checkins, 1, baseDate, [])
    expect(streak).toBe(2)
  })

  it('基準日にチェックイン、前日がスキップ、その前日にチェックインのとき2を返す（スキップは途切れさせない）', () => {
    const checkins = [{ date: '2026-03-15' }, { date: '2026-03-13' }]
    const skips = [{ date: '2026-03-14' }]
    const streak = calculateStreakFromCheckins(dailyHabit(), checkins, 1, baseDate, skips)
    expect(streak).toBe(2)
  })

  it('スキップが3日連続してからチェックインがあると到達できる', () => {
    const checkins = [{ date: '2026-03-15' }, { date: '2026-03-11' }]
    const skips = [{ date: '2026-03-14' }, { date: '2026-03-13' }, { date: '2026-03-12' }]
    const streak = calculateStreakFromCheckins(dailyHabit(), checkins, 1, baseDate, skips)
    expect(streak).toBe(2)
  })

  it('スキップが4日連続してからチェックインがあると、そこで止まる', () => {
    const checkins = [{ date: '2026-03-15' }, { date: '2026-03-10' }]
    const skips = [{ date: '2026-03-14' }, { date: '2026-03-13' }, { date: '2026-03-12' }, { date: '2026-03-11' }]
    const streak = calculateStreakFromCheckins(dailyHabit(), checkins, 1, baseDate, skips)
    expect(streak).toBe(1)
  })

  it('チェックインが0件でスキップのみ2件のとき0を返す（観測値）', () => {
    const checkins: Array<{ date: string }> = []
    const skips = [{ date: '2026-03-15' }, { date: '2026-03-14' }]
    const streak = calculateStreakFromCheckins(dailyHabit(), checkins, 1, baseDate, skips)
    expect(streak).toBe(0)
  })

  it('連続スキップのカウンタがチェックイン成功でリセットされ、スキップ2→チェックイン→スキップ2→チェックインの並びが最後まで到達する', () => {
    const checkins = [{ date: '2026-03-15' }, { date: '2026-03-12' }, { date: '2026-03-09' }]
    const skips = [{ date: '2026-03-14' }, { date: '2026-03-13' }, { date: '2026-03-11' }, { date: '2026-03-10' }]
    const streak = calculateStreakFromCheckins(dailyHabit(), checkins, 1, baseDate, skips)
    expect(streak).toBe(3)
  })

  it('1年以上前のチェックインを渡しても渡さなくても直近のストリークは同じ値になる', () => {
    const recentCheckins = [{ date: '2026-03-15' }, { date: '2026-03-14' }, { date: '2026-03-13' }]
    const withOldCheckin = [...recentCheckins, { date: '2024-01-01' }]
    const streakWithOld = calculateStreakFromCheckins(dailyHabit(), withOldCheckin, 1, baseDate, [])
    const streakWithoutOld = calculateStreakFromCheckins(dailyHabit(), recentCheckins, 1, baseDate, [])
    expect(streakWithoutOld).toBe(3)
    expect(streakWithOld).toBe(streakWithoutOld)
  })
})
