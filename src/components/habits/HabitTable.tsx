import Link from 'next/link'
import { Button } from '@/components/basics/Button'
import { Icon } from '@/components/basics/Icon'
import i18n from '@/lib/i18n-server'
import {
  createRequestMeta,
  formatError,
  isDatabaseError,
  isTimeoutError,
  logInfo,
  logSpan,
  logWarn,
} from '@/lib/logging'
import { getArchivedHabits, getHabitsByUserId } from '@/lib/queries/habit'
import { getRequestTimeoutMs } from '@/lib/server/timeout'
import type { HabitWithProgress } from '@/types/habit'
import { HabitTableClient } from './HabitTableClient'

interface HabitTableProps {
  requestMeta?: { route: string; requestId: string }
  userId: string
}

function toListHabit(habit: Awaited<ReturnType<typeof getHabitsByUserId>>[number]): HabitWithProgress {
  return {
    ...habit,
    completionRate: 0,
    currentProgress: 0,
    skippedToday: false,
    streak: 0,
  }
}

export async function HabitTable({ userId, requestMeta }: HabitTableProps) {
  const timeoutMs = getRequestTimeoutMs()
  const meta = requestMeta ?? createRequestMeta('/habits')

  logInfo('habits.table:start', meta)

  // 一覧は name/period/frequency/createdAt のみ表示するため progress は取らない
  const [activeHabitsResult, archivedHabitsResult] = await Promise.allSettled([
    logSpan('habits.table.query', () => getHabitsByUserId(userId), meta, { timeoutMs }),
    logSpan('habits.table.archived', () => getArchivedHabits(userId), meta, { timeoutMs }),
  ])

  let activeHabits: HabitWithProgress[]
  if (activeHabitsResult.status === 'fulfilled') {
    activeHabits = activeHabitsResult.value.map(toListHabit)
  } else {
    throw activeHabitsResult.reason
  }

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

  const archivedHabitsWithProgress: HabitWithProgress[] = archivedHabits.map(toListHabit)
  const allHabits = [...activeHabits, ...archivedHabitsWithProgress]

  logInfo('habits.table:end', {
    ...meta,
    active: activeHabits.length,
    archived: archivedHabits.length,
    total: allHabits.length,
  })

  if (activeHabits.length === 0 && archivedHabits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border/70 bg-card/80 shadow-sm">
          <Icon className="h-8 w-8 text-muted-foreground" name="target" />
        </div>
        <p className="mb-1 font-semibold text-base">{i18n.t('habits.table.emptyTitle')}</p>
        <p className="mb-4 text-muted-foreground text-sm">{i18n.t('habits.table.emptyDescription')}</p>
        <Button asChild size="lg" variant="default">
          <Link href="/habits/new?step=preset">
            <Icon className="mr-2" name="plus" size={20} />
            {i18n.t('habits.table.createCta')}
          </Link>
        </Button>
      </div>
    )
  }

  return <HabitTableClient habits={allHabits} />
}
