import type { Metadata } from 'next'
import { getCheckinsByUserAndDate } from '@/lib/queries/checkin'
import { getHabitsByUserId } from '@/lib/queries/habit'
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

  const habits = await getHabitsByUserId(user.id)
  const todayCheckins = await getCheckinsByUserAndDate(user.id, new Date())

  return <DashboardWrapper habits={habits} todayCheckins={todayCheckins} user={user} />
}
