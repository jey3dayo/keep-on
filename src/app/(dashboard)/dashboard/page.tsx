import type { Metadata } from 'next'
import { getCheckinsByUserAndDate } from '@/lib/queries/checkin'
import { getHabitsWithProgress } from '@/lib/queries/habit'
import { syncUser } from '@/lib/user'
import { DashboardWrapper } from './DashboardWrapper'

export const metadata: Metadata = {
  title: 'ダッシュボード - KeepOn',
  description: '習慣の進捗状況とアクティビティを確認',
}

export default async function DashboardPage() {
  const user = await syncUser()

  if (!user) {
    throw new Error('Failed to sync user')
  }

  // クエリを並列実行してレスポンス時間を短縮
  const [habits, todayCheckins] = await Promise.all([
    getHabitsWithProgress(user.id, user.clerkId, new Date()),
    getCheckinsByUserAndDate(user.id, new Date()),
  ])

  return <DashboardWrapper habits={habits} todayCheckins={todayCheckins} user={user} />
}
