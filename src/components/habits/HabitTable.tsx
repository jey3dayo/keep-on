import { createRequestMeta, logInfo, logSpan } from '@/lib/logging'
import { getHabitsWithProgress } from '@/lib/queries/habit'
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

  const habits = await logSpan('habits.table.query', () => getHabitsWithProgress(userId, clerkId), meta, { timeoutMs })
  logInfo('habits.table:end', { ...meta, habits: habits.length })

  if (habits.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed p-8">
        <div className="space-y-2 text-center">
          <p className="text-muted-foreground">習慣がまだ登録されていません</p>
          <p className="text-muted-foreground text-sm">新しい習慣を作成してみましょう</p>
        </div>
      </div>
    )
  }

  return <HabitTableClient habits={habits} />
}
