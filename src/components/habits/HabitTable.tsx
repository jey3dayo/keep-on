import { getHabitsCacheSnapshot } from '@/lib/cache/habit-cache'
import { createRequestMeta, formatError, isDatabaseError, isTimeoutError, logInfo, logSpan, logWarn } from '@/lib/logging'
import { getArchivedHabits, getHabitsWithProgress } from '@/lib/queries/habit'
import { getServerDateKey } from '@/lib/server/date'
import { getRequestTimeoutMs } from '@/lib/server/timeout'
import type { HabitWithProgress } from '@/types/habit'
import { HabitTableClient } from './HabitTableClient'

interface HabitTableProps {
  userId: string
  clerkId: string
  requestMeta?: { route: string; requestId: string }
}

export async function HabitTable({ userId, clerkId, requestMeta }: HabitTableProps) {
  const timeoutMs = getRequestTimeoutMs()
  const meta = requestMeta ?? createRequestMeta('/habits')
  const dateKey = await getServerDateKey()
  const cacheSnapshot = await getHabitsCacheSnapshot(userId)
  const staleHabits =
    cacheSnapshot && (cacheSnapshot.staleAt || cacheSnapshot.dateKey !== dateKey) ? cacheSnapshot.habits : null

  logInfo('habits.table:start', meta)

  // アクティブな習慣（進捗付き）
  let activeHabits: HabitWithProgress[]
  try {
    activeHabits = await logSpan(
      'habits.table.query',
      () => getHabitsWithProgress(userId, clerkId, dateKey),
      meta,
      { timeoutMs }
    )
  } catch (error) {
    if (staleHabits && (isTimeoutError(error) || isDatabaseError(error))) {
      logWarn('habits.table.query:stale-fallback', {
        ...meta,
        cachedDateKey: cacheSnapshot?.dateKey,
        requestedDateKey: dateKey,
        error: formatError(error),
      })
      activeHabits = staleHabits
    } else {
      throw error
    }
  }

  // アーカイブ済み習慣
  let archivedHabits: Awaited<ReturnType<typeof getArchivedHabits>> = []
  try {
    archivedHabits = await logSpan('habits.table.archived', () => getArchivedHabits(userId), meta, { timeoutMs })
  } catch (error) {
    if (isTimeoutError(error) || isDatabaseError(error)) {
      logWarn('habits.table.archived:skip', { ...meta, error: formatError(error) })
    } else {
      throw error
    }
  }

  // アーカイブ済み習慣に進捗情報を付与（ダミー値）
  const archivedHabitsWithProgress: HabitWithProgress[] = archivedHabits.map((habit) => ({
    ...habit,
    currentProgress: 0,
    streak: 0,
    completionRate: 0,
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
