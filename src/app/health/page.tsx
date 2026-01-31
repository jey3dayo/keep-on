import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import type { Metadata } from 'next'
import { getRequestTimeoutMs } from '@/lib/server/timeout'

export const metadata: Metadata = {
  title: 'Health - KeepOn',
  description: 'Clerk と DB の設定状態を確認するヘルスチェックページ',
}

export const dynamic = 'force-dynamic'

type Status = 'ok' | 'warn' | 'error'

type DbBinding = 'hyperdrive' | 'database_url' | 'missing'

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

const STATUS_BADGE_STYLES: Record<Status, string> = {
  ok: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warn: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  error: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
}

const STATUS_BADGE_ICONS: Record<Status, typeof CheckCircle2> = {
  ok: CheckCircle2,
  warn: AlertTriangle,
  error: XCircle,
}

const STATUS_BADGE_LABELS: Record<Status, string> = {
  ok: 'OK',
  warn: 'WARN',
  error: 'ERROR',
}

const STATUS_PILL_STYLES: Record<Status, string> = {
  ok: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warn: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  error: 'bg-red-500/10 text-red-700 dark:text-red-300',
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

function resolveDbBinding(envSnapshot: EnvSnapshot): DbBinding {
  if (envSnapshot.hyperdriveConnection) {
    return 'hyperdrive'
  }
  if (envSnapshot.databaseUrl) {
    return 'database_url'
  }
  return 'missing'
}

function describeDbBinding(binding: DbBinding): string {
  switch (binding) {
    case 'hyperdrive':
      return 'Hyperdrive 接続'
    case 'database_url':
      return 'DATABASE_URL 接続'
    case 'missing':
      return 'DB 接続設定が見つかりません'
    default: {
      const _exhaustive: never = binding
      return _exhaustive
    }
  }
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
      clerkPublishableKey: getString(envRecord, 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'),
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

function buildHealthChecks(envSnapshot: EnvSnapshot): HealthCheck[] {
  const publishableMode = getKeyMode(envSnapshot.clerkPublishableKey)
  const secretMode = getKeyMode(envSnapshot.clerkSecretKey)
  const publishableTail = tailKey(envSnapshot.clerkPublishableKey)
  const secretTail = tailKey(envSnapshot.clerkSecretKey)
  const keyMismatch = publishableMode !== 'unknown' && secretMode !== 'unknown' && publishableMode !== secretMode
  const dbBinding = resolveDbBinding(envSnapshot)

  const runtimeDescription = envSnapshot.runtime === 'workers' ? 'Cloudflare Workers 実行中' : 'Node.js 実行中'
  const runtimeStatus: Status = envSnapshot.runtime === 'workers' ? 'ok' : 'warn'
  const publishableMeta =
    publishableMode !== 'unknown'
      ? `mode: ${publishableMode} / tail: ${publishableTail}`
      : `mode: unknown / tail: ${publishableTail}`
  const secretMeta =
    secretMode !== 'unknown' ? `mode: ${secretMode} / tail: ${secretTail}` : `mode: unknown / tail: ${secretTail}`
  const clerkUrlsConfigured = Boolean(envSnapshot.signInUrl && envSnapshot.signUpUrl)

  return [
    {
      id: 'runtime',
      label: 'Runtime',
      status: runtimeStatus,
      description: runtimeDescription,
      meta: envSnapshot.nextjsEnv ? `NEXTJS_ENV: ${envSnapshot.nextjsEnv}` : undefined,
    },
    {
      id: 'clerk-publishable',
      label: 'Clerk Publishable Key',
      status: envSnapshot.clerkPublishableKey ? 'ok' : 'error',
      description: envSnapshot.clerkPublishableKey ? '設定済み' : '未設定',
      meta: publishableMeta,
    },
    {
      id: 'clerk-secret',
      label: 'Clerk Secret Key',
      status: envSnapshot.clerkSecretKey ? 'ok' : 'error',
      description: envSnapshot.clerkSecretKey ? '設定済み' : '未設定',
      meta: secretMeta,
    },
    {
      id: 'clerk-urls',
      label: 'Clerk URLs',
      status: clerkUrlsConfigured ? 'ok' : 'warn',
      description: clerkUrlsConfigured ? 'URL 設定済み' : 'URL 未設定',
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
      description: describeDbBinding(dbBinding),
      meta: dbBinding,
    },
  ]
}

function summarizeChecks(checks: HealthCheck[]): { ok: number; warn: number; error: number } {
  return checks.reduce(
    (acc, check) => {
      if (check.status === 'ok') {
        acc.ok += 1
      }
      if (check.status === 'warn') {
        acc.warn += 1
      }
      if (check.status === 'error') {
        acc.error += 1
      }
      return acc
    },
    { ok: 0, warn: 0, error: 0 }
  )
}

function formatCheckedAt(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(date)
}

function StatusBadge({ status }: { status: Status }) {
  const styles = STATUS_BADGE_STYLES[status]
  const Icon = STATUS_BADGE_ICONS[status]
  const label = STATUS_BADGE_LABELS[status]

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-semibold text-xs uppercase tracking-[0.2em] ${styles}`}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      <span>{label}</span>
    </span>
  )
}

function StatusPill({ label, count, tone }: { label: string; count: number; tone: Status }) {
  const styles = STATUS_PILL_STYLES[tone]
  return (
    <span className={`rounded-full px-3 py-1 font-semibold text-xs ${styles}`}>
      {label} {count}
    </span>
  )
}

function CheckRow({ check }: { check: HealthCheck }) {
  const meta = check.meta ? <span className="text-muted-foreground text-xs">{check.meta}</span> : null

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border/60 bg-background/70 px-4 py-3">
      <div className="space-y-1">
        <p className="font-semibold text-foreground text-sm">{check.label}</p>
        <p className="text-muted-foreground text-xs">{check.description}</p>
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
  const checks = buildHealthChecks(envSnapshot)
  const summary = summarizeChecks(checks)
  const checkedAtLabel = formatCheckedAt(checkedAt)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/40">
      <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-12">
        <header className="space-y-4">
          <p className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.35em]">KeepOn Health</p>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="font-semibold text-3xl text-foreground">ヘルスチェック</h1>
              <p className="text-muted-foreground text-sm">Clerk と DB の設定状態を確認します。値は公開しません。</p>
            </div>
            <a
              className="inline-flex items-center justify-center rounded-full border border-border/60 bg-background px-4 py-2 font-semibold text-foreground text-sm transition hover:border-primary/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href="/health"
            >
              再読み込み
            </a>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill count={summary.ok} label="OK" tone="ok" />
            <StatusPill count={summary.warn} label="WARN" tone="warn" />
            <StatusPill count={summary.error} label="ERROR" tone="error" />
            <span className="text-muted-foreground text-xs">Checked: {checkedAtLabel}</span>
          </div>
        </header>

        <section className="grid gap-4">
          {checks.map((check) => (
            <CheckRow check={check} key={check.id} />
          ))}
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 text-muted-foreground text-xs">
          <span>Request timeout: {requestTimeoutMs}ms</span>
          <span>Runtime: {envSnapshot.runtime}</span>
        </footer>
      </main>
    </div>
  )
}
