import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function Home() {
  const { userId } = await auth()

  // 認証済みの場合はダッシュボードにリダイレクト
  if (userId) {
    redirect('/dashboard')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="space-y-6 p-8 text-center">
        <h1 className="font-bold text-6xl text-slate-900 dark:text-white">KeepOn</h1>
        <p className="text-slate-600 text-xl dark:text-slate-300">習慣トラッキングアプリ</p>
        <div className="flex justify-center gap-4">
          <Link
            className="rounded-lg bg-blue-600 px-6 py-3 text-white transition hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
            href="/sign-in"
          >
            サインイン
          </Link>
          <Link
            className="rounded-lg bg-slate-200 px-6 py-3 text-slate-900 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
            href="/sign-up"
          >
            新規登録
          </Link>
        </div>
      </div>
    </main>
  )
}
