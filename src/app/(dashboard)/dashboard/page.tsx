import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SIGN_IN_PATH } from '@/constants/auth'
import { DEFAULT_DASHBOARD_VIEW } from '@/constants/dashboard'
import { createRequestMeta, logInfo, logSpan } from '@/lib/logging'
import { getCheckinsByUserAndDate } from '@/lib/queries/checkin'
import { getHabitsWithProgress } from '@/lib/queries/habit'
import { getServerDateKey } from '@/lib/server/date'
import { getRequestTimeoutMs } from '@/lib/server/timeout'
import { syncUser } from '@/lib/user'
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
  const dateKey = await getServerDateKey()

  logInfo('request.dashboard:start', requestMeta)

  const user = await logSpan('dashboard.syncUser', () => syncUser(), requestMeta, { timeoutMs })

  if (!user) {
    logInfo('dashboard.syncUser:missing', requestMeta)
    redirect(SIGN_IN_PATH)
  }

  // 同時リクエストの詰まりを避けるため順次実行
  const habits = await logSpan(
    'dashboard.habits',
    () => getHabitsWithProgress(user.id, user.clerkId, dateKey),
    requestMeta,
    { timeoutMs }
  )
  const todayCheckins = await logSpan(
    'dashboard.checkins',
    () => getCheckinsByUserAndDate(user.id, dateKey),
    requestMeta,
    { timeoutMs }
  )

  logInfo('request.dashboard:end', {
    ...requestMeta,
    habits: habits.length,
    checkins: todayCheckins.length,
  })

  return (
    <DashboardWrapper
      habits={habits}
      hasTimeZoneCookie={hasTimeZoneCookie}
      initialView={initialView}
      todayCheckins={todayCheckins}
      user={user}
    />
  )
}
