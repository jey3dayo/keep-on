import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getServerCookie } from '@/lib/server/cookies'
import { formatDateKey } from '@/lib/utils/date'
import { getServerDateKey } from './date'

vi.mock('@/lib/server/cookies', () => ({
  getServerCookie: vi.fn(),
}))

describe('getServerDateKey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('dayStartHour省略時は24（暦どおり）にフォールバックする', async () => {
    vi.mocked(getServerCookie).mockResolvedValue('Asia/Tokyo')
    // 2026-09-02 01:30 JST（境界前）でも 24 時扱いなら当日として扱われる
    const instant = new Date('2026-09-01T16:30:00.000Z')

    const result = await getServerDateKey({ date: instant })

    expect(result).toBe('2026-09-02')
  })

  it('dayStartHourを渡すと日付境界のオフセットが反映される', async () => {
    vi.mocked(getServerCookie).mockResolvedValue('Asia/Tokyo')
    // 2026-09-02 01:30 JST。dayStartHour=26（2:00境界）なら前日扱い
    const instant = new Date('2026-09-01T16:30:00.000Z')

    const result = await getServerDateKey({ date: instant, dayStartHour: 26 })

    expect(result).toBe('2026-09-01')
  })

  it('タイムゾーンcookieが無い場合はローカル暦日にdayStartHourのオフセットを適用する', async () => {
    vi.mocked(getServerCookie).mockResolvedValue(null)
    const instant = new Date('2026-09-02T00:30:00.000')

    const result = await getServerDateKey({ date: instant, dayStartHour: 24 })

    expect(result).toBe(formatDateKey(instant))
  })
})
