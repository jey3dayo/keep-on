import { getHabitsCacheSnapshot } from '@/lib/cache/habit-cache'
import {
  createRequestMeta,
  formatError,
  isDatabaseError,
  isTimeoutError,
  logInfo,
  logSpan,
  logWarn,
} from '@/lib/logging'
import { getArchivedHabits, getHabitsWithProgress } from '@/lib/queries/habit'
import { getServerDateKey } from '@/lib/server/date'
import { getRequestTimeoutMs } from '@/lib/server/timeout'
import type { HabitWithProgress } from '@/types/habit'
import { HabitTableClient } from './HabitTableClient'

interface HabitTableProps {
  clerkId: string
  requestMeta?: { route: string; requestId: string }
  userId: string
}

export async function HabitTable({ userId, clerkId, requestMeta }: HabitTableProps) {
  const timeoutMs = getRequestTimeoutMs()
  const meta = requestMeta ?? createRequestMeta('/habits')
  const dateKey = await getServerDateKey()
  const cacheSnapshot = await getHabitsCacheSnapshot(userId)
  const staleHabits =
    cacheSnapshot && (cacheSnapshot.staleAt || cacheSnapshot.dateKey !== dateKey) ? cacheSnapshot.habits : null

  logInfo('habits.table:start', meta)

  // アクティブな習慣（進捗付き）とアーカイブ済み習慣は互いに独立したクエリのため並列実行する
  const [activeHabitsResult, archivedHabitsResult] = await Promise.allSettled([
    logSpan('habits.table.query', () => getHabitsWithProgress(userId, clerkId, dateKey), meta, { timeoutMs }),
    logSpan('habits.table.archived', () => getArchivedHabits(userId), meta, { timeoutMs }),
  ])

  let activeHabits: HabitWithProgress[]
  if (activeHabitsResult.status === 'fulfilled') {
    activeHabits = activeHabitsResult.value
  } else {
    const error = activeHabitsResult.reason
    if (staleHabits && (isTimeoutError(error) || isDatabaseError(error))) {
      logWarn('habits.table.query:stale-fallback', {
        ...meta,
        cachedDateKey: cacheSnapshot?.dateKey,
        error: formatError(error),
        requestedDateKey: dateKey,
      })
      activeHabits = staleHabits
    } else {
      throw error
    }
  }

  // アーカイブ済み習慣
  let archivedHabits: Awaited<ReturnType<typeof getArchivedHabits>> = []
  if (archivedHabitsResult.status === 'fulfilled') {
    archivedHabits = archivedHabitsResult.value
  } else {
    const error = archivedHabitsResult.reason
    if (isTimeoutError(error) || isDatabaseError(error)) {
      logWarn('habits.table.archived:skip', { ...meta, error: formatError(error) })
    } else {
      throw error
    }
  }

  // アーカイブ済み習慣に進捗情報を付与（ダミー値）
  const archivedHabitsWithProgress: HabitWithProgress[] = archivedHabits.map((habit) => ({
    ...habit,
    completionRate: 0,
    currentProgress: 0,
    skippedToday: false,
    streak: 0,
  }))

  // 両方をマージ
  const allHabits = [...activeHabits, ...archivedHabitsWithProgress]

  logInfo('habits.table:end', {
    ...meta,
    active: activeHabits.length,
    archived: archivedHabits.length,
    total: allHabits.length,
  })

  if (activeHabits.length === 0 && archivedHabits.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed p-8">
        <div className="space-y-2 text-center">
          <p className="text-muted-foreground">習慣がまだ登録されていません</p>
          <p className="text-muted-foreground text-sm">新しい習慣を作成してみましょう</p>
        </div>
      </div>
    )
  }

  return <HabitTableClient habits={allHabits} />
}
