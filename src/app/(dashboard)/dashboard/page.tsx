import { HabitListServer } from '@/components/habits/HabitListServer'
import { syncUser } from '@/lib/user'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  // Clerk認証されたユーザーをPrismaに同期
  const user = await syncUser()

  if (!user) {
    throw new Error('Failed to sync user')
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="space-y-2">
        <h1 className="font-bold text-3xl text-foreground">ダッシュボード</h1>
        <p className="text-muted-foreground">ようこそ、{user.email}さん</p>
      </div>

      <div className="grid gap-8">
        <DashboardClient />

        <section className="space-y-4">
          <h2 className="font-bold text-foreground text-xl">あなたの習慣</h2>
          <HabitListServer />
        </section>
      </div>
    </div>
  )
}
