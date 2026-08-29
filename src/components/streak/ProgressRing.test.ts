import { describe, expect, it } from 'vitest'
import { getProgressRingDurationMs } from './ProgressRing'

describe('getProgressRingDurationMs', () => {
  it.each([
    [100, 280],
    [12.5, 130],
    [0, 130],
    [200, 300],
  ])('等速で読み取れる掃引時間の契約を delta=%s で満たす', (deltaPercent, expectedDurationMs) => {
    expect(getProgressRingDurationMs(deltaPercent)).toBe(expectedDurationMs)
  })
})
