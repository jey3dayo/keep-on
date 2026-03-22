import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import type { Metadata } from 'next'
import { getRequestTimeoutMs } from '@/lib/server/timeout'
import { type ConcurrencyResult, runConcurrencyChecks } from './actions'
import { CONCURRENCY_LIMITS, ITERATION_LIMITS } from './constants'

export const metadata: Metadata = {
  title: '並列実行再現 - KeepOn',
  description: 'Clerk API と DB クエリを並列実行して疎通・タイムアウトを検査するデバッグページ',
}

export const dynamic = 'force-dynamic'

type Status = 'ok' | 'warn' | 'error'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

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

function getParamValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0]
  }
  return value
}

function clampNumber(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback
  }
  return Math.min(max, Math.max(min, value))
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

function BatchRow({ batch }: { batch: ConcurrencyResult['batches'][number] }) {
  const status: Status = batch.error > 0 ? 'error' : 'ok'
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border/60 bg-background/70 px-4 py-3">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 font-semibold text-foreground text-sm">
          <span>Batch {batch.index}</span>
          <span className="text-muted-foreground text-xs">
            OK {batch.ok} / ERROR {batch.error}
          </span>
        </div>
        <p className="text-muted-foreground text-xs">
          min {batch.minMs}ms / max {batch.maxMs}ms / avg {batch.avgMs}ms
        </p>
        {batch.errors.length > 0 ? (
          <ul className="space-y-1 text-red-500/80 text-xs dark:text-red-300">
            {batch.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}
      </div>
      <StatusBadge status={status} />
    </div>
  )
}

export default async function ReproConcurrencyPage({ searchParams }: { searchParams?: SearchParams }) {
  const requestTimeoutMs = getRequestTimeoutMs()
  const params = searchParams ? await searchParams : {}
  const concurrency = clampNumber(
    Number(getParamValue(params.concurrency)),
    CONCURRENCY_LIMITS.min,
    CONCURRENCY_LIMITS.max,
    CONCURRENCY_LIMITS.default
  )
  const iterations = clampNumber(
    Number(getParamValue(params.iterations)),
    ITERATION_LIMITS.min,
    ITERATION_LIMITS.max,
    ITERATION_LIMITS.default
  )
  const shouldRun = getParamValue(params.run) === '1'
  const result = shouldRun ? await runConcurrencyChecks({ concurrency, iterations }) : null
  const checkedAtLabel = result
    ? new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(result.finishedAt))
    : null

  const summary = result
    ? result.batches.reduce(
        (acc, batch) => {
          acc.ok += batch.ok
          acc.error += batch.error
          return acc
        },
        { ok: 0, error: 0 }
      )
    : { ok: 0, error: 0 }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/40">
      <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-12">
        <header className="space-y-4">
          <p className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.35em]">Debug</p>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="font-semibold text-3xl text-foreground">並列実行再現</h1>
              <p className="text-muted-foreground text-sm">
                Clerk API と DB クエリを並列実行し、タイムアウトや失敗率を確認します。
              </p>
            </div>
            <a
              className="inline-flex items-center justify-center rounded-full border border-border/60 bg-background px-4 py-2 font-semibold text-foreground text-sm transition hover:border-primary/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href="/debug/repro-concurrency"
            >
              リセット
            </a>
          </div>
        </header>

        <section className="rounded-2xl border border-border/60 bg-background/70 p-5">
          <form className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]" method="get">
            <div className="space-y-2">
              <label className="font-semibold text-muted-foreground text-xs" htmlFor="concurrency">
                並列数
              </label>
              <input
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                defaultValue={concurrency}
                id="concurrency"
                max={CONCURRENCY_LIMITS.max}
                min={CONCURRENCY_LIMITS.min}
                name="concurrency"
                type="number"
              />
            </div>
            <div className="space-y-2">
              <label className="font-semibold text-muted-foreground text-xs" htmlFor="iterations">
                バッチ回数
              </label>
              <input
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                defaultValue={iterations}
                id="iterations"
                max={ITERATION_LIMITS.max}
                min={ITERATION_LIMITS.min}
                name="iterations"
                type="number"
              />
            </div>
            <input name="run" type="hidden" value="1" />
            <div className="flex items-end">
              <button
                className="inline-flex w-full items-center justify-center rounded-full border border-primary/40 bg-primary/10 px-5 py-2 font-semibold text-primary text-sm transition hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                type="submit"
              >
                実行
              </button>
            </div>
          </form>
          <p className="mt-4 text-muted-foreground text-xs">
            上限: 並列 {CONCURRENCY_LIMITS.max} / バッチ {ITERATION_LIMITS.max}。実行には認証が必要です。
          </p>
        </section>

        {result ? (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill count={summary.ok} label="OK" tone="ok" />
              <StatusPill count={summary.error} label="ERROR" tone="error" />
              {checkedAtLabel ? <span className="text-muted-foreground text-xs">Checked: {checkedAtLabel}</span> : null}
            </div>
            <div className="grid gap-4">
              {result.batches.map((batch) => (
                <BatchRow batch={batch} key={batch.index} />
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-xl border border-border/60 bg-background/70 px-4 py-6 text-muted-foreground text-sm">
            パラメータを設定して「実行」を押すと結果が表示されます。
          </section>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 text-muted-foreground text-xs">
          <span>Request timeout: {requestTimeoutMs}ms</span>
          <span>Endpoint: /debug/repro-concurrency</span>
        </footer>
      </main>
    </div>
  )
}
