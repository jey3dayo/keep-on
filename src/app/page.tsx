import { auth } from '@clerk/nextjs/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'KeepOn - 習慣トラッキングアプリ',
  description: 'シンプルで使いやすい習慣トラッキングアプリ。毎日の習慣を記録して、目標達成をサポートします。',
}

export default async function Home() {
  const { userId } = await auth()

  // 認証済みの場合はダッシュボードにリダイレクト
  if (userId) {
    redirect('/dashboard')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="space-y-6 p-8 text-center">
        <h1 className="font-bold text-6xl text-white">KeepOn</h1>
        <p className="text-slate-300 text-xl">習慣トラッキングアプリ</p>
        <div className="flex justify-center gap-4">
          <Link className="rounded-md bg-blue-600 px-6 py-3 text-white transition hover:bg-blue-700" href="/sign-in">
            サインイン
          </Link>
          <Link className="rounded-md bg-slate-700 px-6 py-3 text-white transition hover:bg-slate-600" href="/sign-up">
            新規登録
          </Link>
        </div>
      </div>
    </main>
  )
}
