import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  description: 'Cloudflare Access と DB の設定状態を確認するヘルスチェックページ',
  title: 'Health - KeepOn',
}

export const dynamic = 'force-dynamic'

type Status = 'ok' | 'warn' | 'error'

type DbBinding = 'd1' | 'missing'

interface HealthCheck {
  description: string
  id: string
  label: string
  meta?: string
  status: Status
}

interface EnvSnapshot {
  accessAud?: string
  accessTeamDomain?: string
  d1Binding: boolean
  nextjsEnv?: string
  runtime: 'workers' | 'node'
}

const STATUS_BADGE_STYLES: Record<Status, string> = {
  error: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
  ok: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warn: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
}

const STATUS_BADGE_ICONS: Record<Status, typeof CheckCircle2> = {
  error: XCircle,
  ok: CheckCircle2,
  warn: AlertTriangle,
}

const STATUS_BADGE_LABELS: Record<Status, string> = {
  error: 'ERROR',
  ok: 'OK',
  warn: 'WARN',
}

const STATUS_PILL_STYLES: Record<Status, string> = {
  error: 'bg-red-500/10 text-red-700 dark:text-red-300',
  ok: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warn: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
}

function getString(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key]
  return typeof value === 'string' ? value : undefined
}

function resolveDbBinding(envSnapshot: EnvSnapshot): DbBinding {
  return envSnapshot.d1Binding ? 'd1' : 'missing'
}

function describeDbBinding(binding: DbBinding): string {
  switch (binding) {
    case 'd1':
      return 'D1 バインディング接続'
    case 'missing':
      return 'D1 バインディングが見つかりません'
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
      accessAud: process.env.ACCESS_AUD,
      accessTeamDomain: process.env.ACCESS_TEAM_DOMAIN,
      d1Binding: false,
      nextjsEnv: process.env.NEXTJS_ENV,
      runtime,
    }
  }

  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    const { env } = getCloudflareContext()
    const envRecord = env as Record<string, unknown>
    const d1Binding = 'DB' in envRecord && envRecord.DB !== null && envRecord.DB !== undefined
    return {
      accessAud: getString(envRecord, 'ACCESS_AUD'),
      accessTeamDomain: getString(envRecord, 'ACCESS_TEAM_DOMAIN'),
      d1Binding,
      nextjsEnv: getString(envRecord, 'NEXTJS_ENV'),
      runtime,
    }
  } catch {
    return {
      accessAud: process.env.ACCESS_AUD,
      accessTeamDomain: process.env.ACCESS_TEAM_DOMAIN,
      d1Binding: false,
      nextjsEnv: process.env.NEXTJS_ENV,
      runtime,
    }
  }
}

function buildHealthChecks(envSnapshot: EnvSnapshot): HealthCheck[] {
  const dbBinding = resolveDbBinding(envSnapshot)

  const runtimeDescription = envSnapshot.runtime === 'workers' ? 'Cloudflare Workers 実行中' : 'Node.js 実行中'
  const runtimeStatus: Status = envSnapshot.runtime === 'workers' ? 'ok' : 'warn'

  return [
    {
      description: runtimeDescription,
      id: 'runtime',
      label: 'Runtime',
      status: runtimeStatus,
    },
    {
      description: envSnapshot.accessTeamDomain ? '設定済み' : '未設定',
      id: 'access-team-domain',
      label: 'Access Team Domain',
      status: envSnapshot.accessTeamDomain ? 'ok' : 'error',
    },
    {
      description: envSnapshot.accessAud ? '設定済み' : '未設定',
      id: 'access-aud',
      label: 'Access AUD',
      status: envSnapshot.accessAud ? 'ok' : 'error',
    },
    {
      description: describeDbBinding(dbBinding),
      id: 'db-binding',
      label: 'DB Binding',
      meta: dbBinding,
      status: dbBinding === 'missing' ? 'error' : 'ok',
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
    { error: 0, ok: 0, warn: 0 }
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
  const envSnapshot = await getEnvSnapshot()
  const checks = buildHealthChecks(envSnapshot)
  const summary = summarizeChecks(checks)
  const checkedAtLabel = formatCheckedAt(checkedAt)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/40">
      <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-12" id="main-content" tabIndex={-1}>
        <header className="space-y-4">
          <p className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.35em]">KeepOn Health</p>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="font-semibold text-3xl text-foreground">ヘルスチェック</h1>
              <p className="text-muted-foreground text-sm">
                Cloudflare Access と DB の設定状態を確認します。値は公開しません。
              </p>
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
          <span>Runtime: {envSnapshot.runtime}</span>
        </footer>
      </main>
    </div>
  )
}
