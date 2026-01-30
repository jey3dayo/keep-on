import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import type { Metadata } from 'next'
import { getRequestTimeoutMs } from '@/lib/server/timeout'
import { runConcurrencyChecks, type ConcurrencyResult } from './actions'
import { CONCURRENCY_LIMITS, ITERATION_LIMITS } from './constants'

export const metadata: Metadata = {
  title: '並列実行再現 - KeepOn',
  description: 'Clerk API と DB クエリを並列実行して疎通・タイムアウトを検査するデバッグページ',
}

export const dynamic = 'force-dynamic'

type Status = 'ok' | 'warn' | 'error'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

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

function BatchRow({ batch }: { batch: ConcurrencyResult['batches'][number] }) {
  const status: Status = batch.error > 0 ? 'error' : 'ok'
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border/60 bg-background/70 px-4 py-3">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
          <span>Batch {batch.index}</span>
          <span className="text-xs text-muted-foreground">OK {batch.ok} / ERROR {batch.error}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          min {batch.minMs}ms / max {batch.maxMs}ms / avg {batch.avgMs}ms
        </p>
        {batch.errors.length > 0 ? (
          <ul className="space-y-1 text-xs text-red-500/80 dark:text-red-300">
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

export default async function ReproConcurrencyPage({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
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
    ? new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeStyle: 'medium' }).format(
        new Date(result.finishedAt)
      )
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
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">Debug</p>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-foreground">並列実行再現</h1>
              <p className="text-sm text-muted-foreground">
                Clerk API と DB クエリを並列実行し、タイムアウトや失敗率を確認します。
              </p>
            </div>
            <a
              className="inline-flex items-center justify-center rounded-full border border-border/60 bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href="/debug/repro-concurrency"
            >
              リセット
            </a>
          </div>
        </header>

        <section className="rounded-2xl border border-border/60 bg-background/70 p-5">
          <form className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]" method="get">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="concurrency">
                並列数
              </label>
              <input
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                defaultValue={concurrency}
                id="concurrency"
                max={CONCURRENCY_LIMITS.max}
                min={CONCURRENCY_LIMITS.min}
                name="concurrency"
                type="number"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="iterations">
                バッチ回数
              </label>
              <input
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                className="inline-flex w-full items-center justify-center rounded-full border border-primary/40 bg-primary/10 px-5 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                type="submit"
              >
                実行
              </button>
            </div>
          </form>
          <p className="mt-4 text-xs text-muted-foreground">
            上限: 並列 {CONCURRENCY_LIMITS.max} / バッチ {ITERATION_LIMITS.max}。実行には認証が必要です。
          </p>
        </section>

        {result ? (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill label="OK" count={summary.ok} tone="ok" />
              <StatusPill label="ERROR" count={summary.error} tone="error" />
              {checkedAtLabel ? (
                <span className="text-xs text-muted-foreground">Checked: {checkedAtLabel}</span>
              ) : null}
            </div>
            <div className="grid gap-4">
              {result.batches.map((batch) => (
                <BatchRow key={batch.index} batch={batch} />
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-xl border border-border/60 bg-background/70 px-4 py-6 text-sm text-muted-foreground">
            パラメータを設定して「実行」を押すと結果が表示されます。
          </section>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>Request timeout: {requestTimeoutMs}ms</span>
          <span>Endpoint: /debug/repro-concurrency</span>
        </footer>
      </main>
    </div>
  )
}
