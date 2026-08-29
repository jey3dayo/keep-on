import { describe, expect, it } from 'vitest'
import { HABIT_INVERSION_DURATION_MS, PROGRESS_RING_MAX_DURATION_MS } from '@/constants/interaction'
import {
  COMPLETION_PULSE_BASE_DELAY_MS,
  COMPLETION_PULSE_DURATION_MS,
  COMPLETION_PULSE_STAGGER_MS,
  COMPLETION_PULSE_TOTAL_DURATION_MS,
  HABITS_PER_PAGE,
} from './HabitSimpleView'

describe('completion pulse timing contract', () => {
  it('反転後にユーザー可視の祝福 pulse が始まる時間を確保する', () => {
    expect(COMPLETION_PULSE_BASE_DELAY_MS).toBeGreaterThanOrEqual(
      PROGRESS_RING_MAX_DURATION_MS + HABIT_INVERSION_DURATION_MS
    )
  })

  it('最後の stagger 後も祝福 pulse 本体が完了するまで状態を保持する', () => {
    expect(COMPLETION_PULSE_TOTAL_DURATION_MS).toBeGreaterThanOrEqual(
      COMPLETION_PULSE_BASE_DELAY_MS +
        (HABITS_PER_PAGE - 1) * COMPLETION_PULSE_STAGGER_MS +
        COMPLETION_PULSE_DURATION_MS
    )
  })
})
