import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Appbar } from '@/components/Appbar'
import { HabitListServer } from '@/components/habits/HabitListServer'
import { syncUser } from '@/lib/user'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  // Clerk認証されたユーザーをPrismaに同期
  const user = await syncUser()

  if (!user) {
    throw new Error('Failed to sync user')
  }

  return (
    <div className="min-h-screen bg-background">
      <Appbar showUserButton />

      <main className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-2">
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
      </main>
    </div>
  )
}
