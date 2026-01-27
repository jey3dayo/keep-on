import { createRequestMeta, logInfo, logSpan } from '@/lib/logging'
import { getArchivedHabits, getHabitsWithProgress } from '@/lib/queries/habit'
import type { HabitWithProgress } from '@/types/habit'
import { HabitTableClient } from './HabitTableClient'

interface HabitTableProps {
  userId: string
  clerkId: string
  requestMeta?: { route: string; requestId: string }
}

export async function HabitTable({ userId, clerkId, requestMeta }: HabitTableProps) {
  const timeoutMs = 8000
  const meta = requestMeta ?? createRequestMeta('/habits')

  logInfo('habits.table:start', meta)

  // アクティブな習慣（進捗付き）
  const activeHabits = await logSpan('habits.table.query', () => getHabitsWithProgress(userId, clerkId), meta, {
    timeoutMs,
  })

  // アーカイブ済み習慣
  const archivedHabits = await logSpan('habits.table.archived', () => getArchivedHabits(userId), meta, { timeoutMs })

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
