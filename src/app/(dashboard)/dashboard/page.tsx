import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { SIGN_IN_PATH } from '@/constants/auth'
import { createRequestMeta, logInfo, logSpan } from '@/lib/logging'
import { getCheckinsByUserAndDate } from '@/lib/queries/checkin'
import { getHabitsWithProgress } from '@/lib/queries/habit'
import { getServerCookie } from '@/lib/server/cookies'
import { syncUser } from '@/lib/user'
import { formatDateKey, getDateKeyInTimeZone } from '@/lib/utils/date'
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
  const timeoutMs = 8000
  const requestMeta = createRequestMeta('/dashboard')
  const timeZoneRaw = await getServerCookie('ko_tz')
  const timeZone = timeZoneRaw ? decodeURIComponent(timeZoneRaw) : undefined
  const dateKey = timeZone ? getDateKeyInTimeZone(new Date(), timeZone) : formatDateKey(new Date())

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

  return <DashboardWrapper habits={habits} todayCheckins={todayCheckins} user={user} />
}
