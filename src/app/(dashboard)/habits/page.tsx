import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/basics/Button'
import { Icon } from '@/components/basics/Icon'
import { HabitsListClient } from '@/components/habits/HabitsListClient'
import { PageShell } from '@/components/PageShell'
import { SIGN_IN_PATH } from '@/constants/auth'
import { getHabitsCacheSnapshot } from '@/lib/cache/habit-cache'
import { withDbRetry } from '@/lib/db-retry'
import {
  createRequestMeta,
  formatError,
  isDatabaseError,
  isTimeoutError,
  logInfo,
  logSpan,
  logSpanOptional,
  logWarn,
} from '@/lib/logging'
import { getArchivedHabits, getHabitsWithProgress } from '@/lib/queries/habit'
import { getServerDateKey } from '@/lib/server/date'
import { getRequestTimeoutMs } from '@/lib/server/timeout'
import { syncUser } from '@/lib/user'
import { formatDateLabel, parseDateKey } from '@/lib/utils/date'
import type { HabitWithProgress } from '@/types/habit'

export const metadata: Metadata = {
  description:
    'あなたの習慣を一元管理。新しい習慣の作成、既存の習慣の編集・削除、カテゴリ別の整理、絵文字やカラーのカスタマイズができます。',
  openGraph: {
    description: '習慣の作成、編集、管理を簡単に',
    title: '習慣管理 - KeepOn',
    type: 'website',
  },
  title: '習慣 - KeepOn',
}

type ArchivedHabit = Awaited<ReturnType<typeof getArchivedHabits>>[number]

function toArchivedHabit(habit: ArchivedHabit): HabitWithProgress {
  return {
    ...habit,
    archived: true,
    completionRate: 0,
    currentProgress: 0,
    skippedToday: false,
    streak: 0,
  }
}

export default async function HabitsPage() {
  const timeoutMs = getRequestTimeoutMs()
  const requestMeta = createRequestMeta('/habits')
  const now = new Date()

  logInfo('request.habits:start', requestMeta)

  const user = await logSpanOptional('habits.syncUser', () => syncUser(), requestMeta, { timeoutMs })

  if (!user) {
    logInfo('habits.syncUser:missing', requestMeta)
    redirect(SIGN_IN_PATH)
  }

  // dayStartHour はユーザー設定なので syncUser 後に算出する（getServerDateKey 自体は cookie 読み取りのみで
  // DB 往復は増えない）
  const dateKey = await getServerDateKey({ date: now, dayStartHour: user.dayStartHour })
  // 表示の「今日」は記録先の dateKey と一致させる（ズレると記録と表示が食い違う）
  const todayLabel = formatDateLabel(parseDateKey(dateKey))

  const cacheSnapshot = await getHabitsCacheSnapshot(user.id)
  const isStale = cacheSnapshot && (cacheSnapshot.staleAt !== undefined || cacheSnapshot.dateKey !== dateKey)
  const staleHabits = isStale ? cacheSnapshot.habits : null

  const [activeHabitsResult, archivedHabitsResult] = await Promise.allSettled([
    logSpan(
      'habits.progress.query',
      () =>
        withDbRetry(
          'habits.progress',
          () => getHabitsWithProgress(user.id, user.externalId, dateKey, user.weekStart, cacheSnapshot),
          { timeoutMs }
        ),
      requestMeta,
      { timeoutMs }
    ),
    logSpan(
      'habits.archived.query',
      () => withDbRetry('habits.archived', () => getArchivedHabits(user.id), { timeoutMs }),
      requestMeta,
      { timeoutMs }
    ),
  ])

  let activeHabits: HabitWithProgress[]
  if (activeHabitsResult.status === 'fulfilled') {
    activeHabits = activeHabitsResult.value
  } else if (staleHabits && (isTimeoutError(activeHabitsResult.reason) || isDatabaseError(activeHabitsResult.reason))) {
    logWarn('habits.progress:stale-fallback', {
      cachedDateKey: cacheSnapshot?.dateKey,
      error: formatError(activeHabitsResult.reason),
      requestedDateKey: dateKey,
    })
    activeHabits = staleHabits
  } else {
    throw activeHabitsResult.reason
  }

  let archivedHabits: ArchivedHabit[] = []
  if (archivedHabitsResult.status === 'fulfilled') {
    archivedHabits = archivedHabitsResult.value
  } else if (isTimeoutError(archivedHabitsResult.reason) || isDatabaseError(archivedHabitsResult.reason)) {
    logWarn('habits.archived:skip', { ...requestMeta, error: formatError(archivedHabitsResult.reason) })
  } else {
    throw archivedHabitsResult.reason
  }

  const allHabits = [...activeHabits, ...archivedHabits.map(toArchivedHabit)]

  logInfo('request.habits:end', {
    ...requestMeta,
    active: activeHabits.length,
    archived: archivedHabits.length,
    habits: allHabits.length,
  })

  return (
    <PageShell>
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">あなたの習慣を管理しましょう</p>
        <Button asChild size="lg" variant="default">
          <Link href="/habits/new?step=preset">
            <Icon className="mr-2" name="plus" size={20} />
            新しい習慣
          </Link>
        </Button>
      </div>
      <HabitsListClient habits={allHabits} todayLabel={todayLabel} />
    </PageShell>
  )
}
