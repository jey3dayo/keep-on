import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { SIGN_IN_PATH } from '@/constants/auth'
import { getHabitsCacheSnapshot } from '@/lib/cache/habit-cache'
import { withDbRetry } from '@/lib/db-retry'
import {
  createRequestMeta,
  formatError,
  isDatabaseError,
  isTimeoutError,
  logInfo,
  logSpanOptional,
  logWarn,
} from '@/lib/logging'
import { getHabitsWithProgress } from '@/lib/queries/habit'
import { getServerDateKey, getServerTimeZone } from '@/lib/server/date'
import { getRequestTimeoutMs } from '@/lib/server/timeout'
import { syncUser } from '@/lib/user'
import { formatDateLabel } from '@/lib/utils/date'
import type { HabitWithProgress } from '@/types/habit'
import { DashboardWrapper } from './DashboardWrapper'

export const metadata: Metadata = {
  description:
    'あなたの習慣追踪の進捗状況とアクティビティを一目で確認。今日の達成状況、習慣の連続記録（ストリーク）、統計情報をダッシュボードでチェック。',
  openGraph: {
    description: '習慣追踪の進捗状況とアクティビティを一目で確認',
    title: 'ダッシュボード - KeepOn',
    type: 'website',
  },
  title: 'ダッシュボード - KeepOn',
}

export default async function DashboardPage() {
  const timeoutMs = getRequestTimeoutMs()
  const requestMeta = createRequestMeta('/dashboard')
  const now = new Date()
  const [dateKey, timeZone] = await Promise.all([getServerDateKey({ date: now }), getServerTimeZone()])
  const todayLabel = formatDateLabel(now, timeZone)

  logInfo('request.dashboard:start', requestMeta)

  const user = await logSpanOptional('dashboard.syncUser', () => syncUser(), requestMeta, { timeoutMs })

  if (!user) {
    redirect(SIGN_IN_PATH)
  }

  const cacheSnapshot = await getHabitsCacheSnapshot(user.id)
  const isStale = cacheSnapshot && (cacheSnapshot.staleAt !== undefined || cacheSnapshot.dateKey !== dateKey)
  const staleHabits = isStale ? cacheSnapshot.habits : null

  let habits: HabitWithProgress[]
  try {
    habits = await withDbRetry(
      'dashboard.habits',
      () => getHabitsWithProgress(user.id, user.externalId, dateKey, user.weekStart, cacheSnapshot),
      { timeoutMs }
    )
  } catch (error) {
    if (staleHabits && (isTimeoutError(error) || isDatabaseError(error))) {
      logWarn('dashboard.habits:stale-fallback', {
        cachedDateKey: cacheSnapshot?.dateKey,
        error: formatError(error),
        requestedDateKey: dateKey,
      })
      habits = staleHabits
    } else {
      throw error
    }
  }

  logInfo('request.dashboard:end', {
    ...requestMeta,
    habits: habits.length,
  })

  return <DashboardWrapper habits={habits} todayLabel={todayLabel} user={user} />
}
