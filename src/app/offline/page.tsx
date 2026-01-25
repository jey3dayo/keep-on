import Link from 'next/link'

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="space-y-6 p-8 text-center">
        <div className="text-6xl">📴</div>
        <h1 className="font-bold text-2xl text-foreground">オフラインです</h1>
        <p className="text-muted-foreground">
          インターネット接続が必要です。
          <br />
          接続を確認してもう一度お試しください。
        </p>
        <Link
          className="inline-block rounded-md bg-primary px-6 py-3 text-primary-foreground transition hover:bg-primary/90"
          href="/"
        >
          再試行
        </Link>
      </div>
    </main>
  )
}
