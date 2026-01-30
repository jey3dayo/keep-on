import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SIGN_IN_PATH } from '@/constants/auth'
import { DEFAULT_DASHBOARD_VIEW } from '@/constants/dashboard'
import { resetDb } from '@/lib/db'
import { createRequestMeta, formatError, logInfo, logSpan, logSpanOptional, logWarn } from '@/lib/logging'
import { getHabitsWithProgress } from '@/lib/queries/habit'
import { getServerDateKey, getServerTimeZone } from '@/lib/server/date'
import { getRequestTimeoutMs } from '@/lib/server/timeout'
import { syncUser } from '@/lib/user'
import { formatDateLabel } from '@/lib/utils/date'
import { DashboardWrapper } from './DashboardWrapper'

export const metadata: Metadata = {
  title: 'ダッシュボード - KeepOn',
  description:
    'あなたの習慣追踪の進捗状況とアクティビティを一目で確認。今日の達成状況、習慣の連続記録（ストリーク）、統計情報をダッシュボードでチェック。',
  openGraph: {
    title: 'ダッシュボード - KeepOn',
    description: '習慣追踪の進捗状況とアクティビティを一目で確認',
    type: 'website',
  },
}

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const rawView = cookieStore.get('ko_dashboard_view')?.value
  const initialView = rawView === 'simple' || rawView === 'dashboard' ? rawView : DEFAULT_DASHBOARD_VIEW
  const hasTimeZoneCookie = cookieStore.has('ko_tz')
  const timeoutMs = getRequestTimeoutMs()
  const requestMeta = createRequestMeta('/dashboard')
  const now = new Date()
  const [dateKey, timeZone] = await Promise.all([getServerDateKey({ date: now }), getServerTimeZone()])
  const todayLabel = formatDateLabel(now, timeZone)

  logInfo('request.dashboard:start', requestMeta)

  const user = await logSpanOptional('dashboard.syncUser', () => syncUser(), requestMeta, { timeoutMs })

  if (!user) {
    logInfo('dashboard.syncUser:missing', requestMeta)
    redirect(SIGN_IN_PATH)
  }

  const habits = await logSpan(
    'dashboard.habits',
    async () => {
      try {
        return await getHabitsWithProgress(user.id, user.clerkId, dateKey, user.weekStart)
      } catch (error) {
        logWarn('dashboard.habits:retry', { ...requestMeta, error: formatError(error) })
        await resetDb('dashboard.habits retry')
        return await getHabitsWithProgress(user.id, user.clerkId, dateKey, user.weekStart)
      }
    },
    requestMeta,
    { timeoutMs }
  )

  logInfo('request.dashboard:end', {
    ...requestMeta,
    habits: habits.length,
  })

  return (
    <DashboardWrapper
      habits={habits}
      hasTimeZoneCookie={hasTimeZoneCookie}
      initialView={initialView}
      todayLabel={todayLabel}
      user={user}
    />
  )
}
