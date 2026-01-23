import { UserButton } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher'
import { syncUser } from '@/lib/user'

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-900 dark:to-slate-800">
      <nav className="border-slate-700 border-b bg-slate-800/50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <h1 className="font-bold text-2xl text-white dark:text-white">KeepOn</h1>
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <UserButton />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl p-6">
        <div className="mb-8">
          <h2 className="mb-2 font-bold text-3xl text-slate-900 dark:text-white">ダッシュボード</h2>
          <p className="text-slate-600 dark:text-slate-300">ようこそ、{user.email}さん</p>
        </div>

        <div className="rounded-lg bg-slate-100 p-6 dark:bg-slate-800/50">
          <p className="text-center text-slate-600 dark:text-slate-400">習慣を作成して、トラッキングを始めましょう</p>
        </div>
      </main>
    </div>
  )
}
