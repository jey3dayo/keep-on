import { UserButton } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <nav className="border-slate-200 border-b bg-white/50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="font-bold text-2xl text-slate-900 dark:text-white">KeepOn</h1>
          <UserButton />
        </div>
      </nav>

      <main className="mx-auto max-w-6xl p-6">
        <div className="mb-8">
          <h2 className="mb-2 font-bold text-3xl text-slate-900 dark:text-white">ダッシュボード</h2>
          <p className="text-slate-600 dark:text-slate-300">ようこそ、{user.email}さん</p>
        </div>

        <div className="space-y-8">
          <DashboardClient />

          <section>
            <h3 className="mb-4 font-bold text-slate-900 text-xl dark:text-white">あなたの習慣</h3>
            <HabitListServer />
          </section>
        </div>
      </main>
    </div>
  )
}
