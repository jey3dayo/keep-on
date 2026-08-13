import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/cache/habit-cache', () => ({
  getHabitsCacheSnapshot: vi.fn(),
  setHabitsCache: vi.fn().mockResolvedValue(undefined),
}))

// habits / checkins / skips のクエリは habitList を空にして早期 return させ、
// このテストの関心事（preloadedSnapshot 有無による getHabitsCacheSnapshot 呼び出し）以外の
// DB 挙動を再現する必要をなくす。where は orderBy を伴う呼び出し（habits/checkins）と
// 伴わない呼び出し（skips）の両方から使われるため、awaitable かつ chainable にしている。
vi.mock('@/lib/db', () => {
  const awaitableWhereResult = {
    orderBy: vi.fn().mockResolvedValue([]),
    // biome-ignore lint/suspicious/noThenProperty: drizzle のクエリビルダー自体が thenable なので、それを模倣する意図的なモック
    then: (resolve: (value: unknown[]) => void) => resolve([]),
  }

  const dbMock = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnValue(awaitableWhereResult),
  }

  return {
    getDb: vi.fn().mockReturnValue(dbMock),
  }
})

import { getHabitsCacheSnapshot } from '@/lib/cache/habit-cache'
import { getHabitsWithProgress } from '../habit-read'

describe('getHabitsWithProgress: preloadedSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('preloadedSnapshotを渡さない場合はgetHabitsCacheSnapshotを呼ぶ', async () => {
    vi.mocked(getHabitsCacheSnapshot).mockResolvedValue(null)

    await getHabitsWithProgress('user-1', 'clerk-1', '2026-03-15', 'monday')

    expect(getHabitsCacheSnapshot).toHaveBeenCalledWith('user-1')
  })

  it('preloadedSnapshotにnullを渡した場合はgetHabitsCacheSnapshotを呼ばない', async () => {
    await getHabitsWithProgress('user-1', 'clerk-1', '2026-03-15', 'monday', null)

    expect(getHabitsCacheSnapshot).not.toHaveBeenCalled()
  })

  it('preloadedSnapshotにスナップショットを渡した場合はgetHabitsCacheSnapshotを呼ばない', async () => {
    const result = await getHabitsWithProgress('user-1', 'clerk-1', '2026-03-15', 'monday', {
      dateKey: '2026-03-15',
      habits: [],
      timestamp: Date.now(),
    })

    expect(getHabitsCacheSnapshot).not.toHaveBeenCalled()
    // dateKey が一致し staleAt が未設定のためキャッシュヒットし、渡した habits がそのまま返る
    expect(result).toEqual([])
  })
})
