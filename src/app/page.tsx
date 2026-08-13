import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ACCESS_LOGOUT_URL } from '@/constants/auth'
import { getAccessIdentity } from '@/lib/auth/access'

export const metadata: Metadata = {
  description: '認証状態を確認できませんでした',
  title: '認証が必要です - KeepOn',
}

/**
 * `/` は認証済みならダッシュボードへ。JWT 検証失敗時はここに留まり、
 * `/dashboard` → `/` → `/dashboard` の相互リダイレクトを起こさない。
 */
export default async function Page() {
  const identity = await getAccessIdentity()
  if (identity) {
    redirect('/dashboard')
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background">
      <div className="space-y-6 p-8 text-center">
        <h1 className="font-bold text-2xl text-foreground">認証が必要です</h1>
        <p className="text-muted-foreground">
          セッションを確認できませんでした。
          <br />
          再度サインインしてください。
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            className="inline-block rounded-md bg-primary px-6 py-3 text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            href={ACCESS_LOGOUT_URL}
          >
            サインインし直す
          </a>
          <a
            className="inline-block rounded-md border border-border px-6 py-3 text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            href="/"
          >
            再試行
          </a>
        </div>
      </div>
    </main>
  )
}
