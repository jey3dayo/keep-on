import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import type { Metadata } from 'next'
import { getRequestTimeoutMs } from '@/lib/server/timeout'

export const metadata: Metadata = {
  title: 'Health - KeepOn',
  description: 'Clerk と DB の設定状態を確認するヘルスチェックページ',
}

export const dynamic = 'force-dynamic'

type Status = 'ok' | 'warn' | 'error'

interface HealthCheck {
  id: string
  label: string
  status: Status
  description: string
  meta?: string
}

interface EnvSnapshot {
  runtime: 'workers' | 'node'
  nextjsEnv?: string
  clerkPublishableKey?: string
  clerkSecretKey?: string
  signInUrl?: string
  signUpUrl?: string
  databaseUrl?: string
  hyperdriveConnection?: string
}

function getString(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key]
  return typeof value === 'string' ? value : undefined
}

function getKeyMode(value?: string): 'test' | 'live' | 'unknown' {
  if (!value) {
    return 'unknown'
  }
  if (value.startsWith('pk_test') || value.startsWith('sk_test')) {
    return 'test'
  }
  if (value.startsWith('pk_live') || value.startsWith('sk_live')) {
    return 'live'
  }
  return 'unknown'
}

function tailKey(value?: string): string {
  return value ? value.slice(-4) : 'none'
}

async function getEnvSnapshot(): Promise<EnvSnapshot> {
  const isWorkersRuntime = typeof globalThis !== 'undefined' && 'caches' in globalThis
  const runtime: EnvSnapshot['runtime'] = isWorkersRuntime ? 'workers' : 'node'

  if (!isWorkersRuntime) {
    return {
      runtime,
      nextjsEnv: process.env.NEXTJS_ENV,
      clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      clerkSecretKey: process.env.CLERK_SECRET_KEY,
      signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
      signUpUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
      databaseUrl: process.env.DATABASE_URL,
    }
  }

  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    const { env } = getCloudflareContext()
    const envRecord = env as Record<string, unknown>
    const hyperdrive = envRecord.HYPERDRIVE
    const hyperdriveConnection =
      typeof hyperdrive === 'object' && hyperdrive && 'connectionString' in hyperdrive
        ? getString(hyperdrive as Record<string, unknown>, 'connectionString')
        : undefined
    return {
      runtime,
      nextjsEnv: getString(envRecord, 'NEXTJS_ENV'),
      clerkPublishableKey:
        getString(envRecord, 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'),
      clerkSecretKey: getString(envRecord, 'CLERK_SECRET_KEY'),
      signInUrl: getString(envRecord, 'NEXT_PUBLIC_CLERK_SIGN_IN_URL'),
      signUpUrl: getString(envRecord, 'NEXT_PUBLIC_CLERK_SIGN_UP_URL'),
      databaseUrl: getString(envRecord, 'DATABASE_URL'),
      hyperdriveConnection,
    }
  } catch {
    return {
      runtime,
      nextjsEnv: process.env.NEXTJS_ENV,
      clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      clerkSecretKey: process.env.CLERK_SECRET_KEY,
      signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
      signUpUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
      databaseUrl: process.env.DATABASE_URL,
    }
  }
}

function StatusBadge({ status }: { status: Status }) {
  const styles =
    status === 'ok'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      : status === 'warn'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
        : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
  const Icon = status === 'ok' ? CheckCircle2 : status === 'warn' ? AlertTriangle : XCircle
  const label = status === 'ok' ? 'OK' : status === 'warn' ? 'WARN' : 'ERROR'

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${styles}`}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      <span>{label}</span>
    </span>
  )
}

function StatusPill({ label, count, tone }: { label: string; count: number; tone: Status }) {
  const styles =
    tone === 'ok'
      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      : tone === 'warn'
        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
        : 'bg-red-500/10 text-red-700 dark:text-red-300'
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles}`}>
      {label} {count}
    </span>
  )
}

function CheckRow({ check }: { check: HealthCheck }) {
  const meta = check.meta ? <span className="text-xs text-muted-foreground">{check.meta}</span> : null

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border/60 bg-background/70 px-4 py-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{check.label}</p>
        <p className="text-xs text-muted-foreground">{check.description}</p>
        {meta}
      </div>
      <StatusBadge status={check.status} />
    </div>
  )
}

export default async function HealthPage() {
  const checkedAt = new Date()
  const requestTimeoutMs = getRequestTimeoutMs()

  const envSnapshot = await getEnvSnapshot()

  const publishableMode = getKeyMode(envSnapshot.clerkPublishableKey)
  const secretMode = getKeyMode(envSnapshot.clerkSecretKey)
  const publishableTail = tailKey(envSnapshot.clerkPublishableKey)
  const secretTail = tailKey(envSnapshot.clerkSecretKey)
  const keyMismatch =
    publishableMode !== 'unknown' && secretMode !== 'unknown' && publishableMode !== secretMode

  const dbBinding = envSnapshot.hyperdriveConnection
    ? 'hyperdrive'
    : envSnapshot.databaseUrl
      ? 'database_url'
      : 'missing'

  const checks: HealthCheck[] = [
    {
      id: 'runtime',
      label: 'Runtime',
      status: envSnapshot.runtime === 'workers' ? 'ok' : 'warn',
      description: envSnapshot.runtime === 'workers' ? 'Cloudflare Workers 実行中' : 'Node.js 実行中',
      meta: envSnapshot.nextjsEnv ? `NEXTJS_ENV: ${envSnapshot.nextjsEnv}` : undefined,
    },
    {
      id: 'clerk-publishable',
      label: 'Clerk Publishable Key',
      status: envSnapshot.clerkPublishableKey ? 'ok' : 'error',
      description: envSnapshot.clerkPublishableKey ? '設定済み' : '未設定',
      meta:
        publishableMode !== 'unknown'
          ? `mode: ${publishableMode} / tail: ${publishableTail}`
          : `mode: unknown / tail: ${publishableTail}`,
    },
    {
      id: 'clerk-secret',
      label: 'Clerk Secret Key',
      status: envSnapshot.clerkSecretKey ? 'ok' : 'error',
      description: envSnapshot.clerkSecretKey ? '設定済み' : '未設定',
      meta:
        secretMode !== 'unknown'
          ? `mode: ${secretMode} / tail: ${secretTail}`
          : `mode: unknown / tail: ${secretTail}`,
    },
    {
      id: 'clerk-urls',
      label: 'Clerk URLs',
      status: envSnapshot.signInUrl && envSnapshot.signUpUrl ? 'ok' : 'warn',
      description: envSnapshot.signInUrl && envSnapshot.signUpUrl ? 'URL 設定済み' : 'URL 未設定',
      meta: `sign-in: ${envSnapshot.signInUrl ?? '-'} / sign-up: ${envSnapshot.signUpUrl ?? '-'}`,
    },
    {
      id: 'clerk-mode',
      label: 'Clerk Key Mode',
      status: keyMismatch ? 'warn' : 'ok',
      description: keyMismatch ? 'Publishable/Secret の mode が不一致' : 'Publishable/Secret の mode 一致',
      meta: `publishable: ${publishableMode} / secret: ${secretMode}`,
    },
    {
      id: 'db-binding',
      label: 'DB Binding',
      status: dbBinding === 'missing' ? 'error' : 'ok',
      description:
        dbBinding === 'hyperdrive'
          ? 'Hyperdrive 接続'
          : dbBinding === 'database_url'
            ? 'DATABASE_URL 接続'
            : 'DB 接続設定が見つかりません',
      meta: dbBinding,
    },
  ]

  const summary = checks.reduce(
    (acc, check) => {
      if (check.status === 'ok') acc.ok += 1
      if (check.status === 'warn') acc.warn += 1
      if (check.status === 'error') acc.error += 1
      return acc
    },
    { ok: 0, warn: 0, error: 0 }
  )

  const checkedAtLabel = new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(checkedAt)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/40">
      <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-12">
        <header className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">KeepOn Health</p>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-foreground">ヘルスチェック</h1>
              <p className="text-sm text-muted-foreground">
                Clerk と DB の設定状態を確認します。値は公開しません。
              </p>
            </div>
            <a
              className="inline-flex items-center justify-center rounded-full border border-border/60 bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href="/health"
            >
              再読み込み
            </a>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill label="OK" count={summary.ok} tone="ok" />
            <StatusPill label="WARN" count={summary.warn} tone="warn" />
            <StatusPill label="ERROR" count={summary.error} tone="error" />
            <span className="text-xs text-muted-foreground">Checked: {checkedAtLabel}</span>
          </div>
        </header>

        <section className="grid gap-4">
          {checks.map((check) => (
            <CheckRow key={check.id} check={check} />
          ))}
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>Request timeout: {requestTimeoutMs}ms</span>
          <span>Runtime: {envSnapshot.runtime}</span>
        </footer>
      </main>
    </div>
  )
}
