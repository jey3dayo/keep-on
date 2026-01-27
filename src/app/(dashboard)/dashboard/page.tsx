import type { Metadata } from 'next'
import { createRequestMeta, logInfo, logSpan } from '@/lib/logging'
import { getCheckinsByUserAndDate } from '@/lib/queries/checkin'
import { getHabitsWithProgress } from '@/lib/queries/habit'
import { syncUser } from '@/lib/user'
import { DashboardWrapper } from './DashboardWrapper'

export const metadata: Metadata = {
  title: 'ダッシュボード - KeepOn',
  description: '習慣の進捗状況とアクティビティを確認',
}

export default async function DashboardPage() {
  const timeoutMs = 8000
  const requestMeta = createRequestMeta('/dashboard')

  logInfo('request.dashboard:start', requestMeta)

  const user = await logSpan('dashboard.syncUser', () => syncUser(), requestMeta, { timeoutMs })

  if (!user) {
    logInfo('dashboard.syncUser:missing', requestMeta)
    throw new Error('Failed to sync user')
  }

  // 同時リクエストの詰まりを避けるため順次実行
  const habits = await logSpan(
    'dashboard.habits',
    () => getHabitsWithProgress(user.id, user.clerkId, new Date()),
    requestMeta,
    { timeoutMs }
  )
  const todayCheckins = await logSpan(
    'dashboard.checkins',
    () => getCheckinsByUserAndDate(user.id, new Date()),
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
