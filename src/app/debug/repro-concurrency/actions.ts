'use server'

import { clerkClient } from '@clerk/nextjs/server'
import { sql } from 'drizzle-orm'
import { users } from '@/db/schema'
import { getDb } from '@/lib/db'
import { formatError } from '@/lib/logging'
import { CONCURRENCY_LIMITS, ITERATION_LIMITS } from './constants'

export interface ConcurrencyParams {
  concurrency: number
  iterations: number
}

export interface ConcurrencyResult {
  concurrency: number
  iterations: number
  startedAt: string
  finishedAt: string
  batches: Array<{
    index: number
    ok: number
    error: number
    minMs: number
    maxMs: number
    avgMs: number
    errors: string[]
  }>
}

interface TaskResult {
  ok: boolean
  durationMs: number
  errors: string[]
}

interface TimedCheck {
  ok: boolean
  durationMs: number
  error?: string
}

function clampNumber(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback
  }
  return Math.min(max, Math.max(min, value))
}

function uniqueErrors(errors: string[], limit = 5): string[] {
  const seen = new Set<string>()
  const output: string[] = []
  for (const entry of errors) {
    if (!entry || seen.has(entry)) {
      continue
    }
    seen.add(entry)
    output.push(entry)
    if (output.length >= limit) {
      break
    }
  }
  return output
}

async function runTimed(action: () => Promise<void>): Promise<TimedCheck> {
  const start = Date.now()
  try {
    await action()
    return { ok: true, durationMs: Date.now() - start }
  } catch (error) {
    return { ok: false, durationMs: Date.now() - start, error: formatError(error).message }
  }
}

async function resolveClerkClient() {
  try {
    const client = await clerkClient()
    return { client }
  } catch (error) {
    return { client: null, error: formatError(error).message }
  }
}

async function runTask(
  db: Awaited<ReturnType<typeof getDb>>,
  clerk: Awaited<ReturnType<typeof clerkClient>> | null,
  clerkError?: string
): Promise<TaskResult> {
  const start = Date.now()
  const errors: string[] = []

  if (clerkError) {
    errors.push(clerkError)
  }

  const checks: Promise<TimedCheck>[] = []
  if (clerk) {
    checks.push(
      runTimed(async () => {
        await clerk.users.getUserList({ limit: 1 })
      })
    )
  }

  checks.push(
    runTimed(async () => {
      await db.execute(sql`select 1`)
    })
  )
  checks.push(
    runTimed(async () => {
      await db.select({ id: users.id }).from(users).limit(1)
    })
  )

  const results = await Promise.all(checks)
  for (const result of results) {
    if (!result.ok && result.error) {
      errors.push(result.error)
    }
  }

  return {
    ok: errors.length === 0,
    durationMs: Date.now() - start,
    errors,
  }
}

export async function runConcurrencyChecks(params: ConcurrencyParams): Promise<ConcurrencyResult> {
  const concurrency = clampNumber(
    params.concurrency,
    CONCURRENCY_LIMITS.min,
    CONCURRENCY_LIMITS.max,
    CONCURRENCY_LIMITS.default
  )
  const iterations = clampNumber(
    params.iterations,
    ITERATION_LIMITS.min,
    ITERATION_LIMITS.max,
    ITERATION_LIMITS.default
  )

  const startedAt = new Date().toISOString()
  const db = await getDb()
  const { client: clerk, error: clerkError } = await resolveClerkClient()
  const batches: ConcurrencyResult['batches'] = []

  for (let index = 0; index < iterations; index += 1) {
    const tasks = Array.from({ length: concurrency }, () => runTask(db, clerk, clerkError))
    const results = await Promise.all(tasks)
    const durations = results.map((result) => result.durationMs)
    const okCount = results.filter((result) => result.ok).length
    const errorCount = results.length - okCount
    const totalMs = durations.reduce((acc, value) => acc + value, 0)
    const minMs = durations.length ? Math.min(...durations) : 0
    const maxMs = durations.length ? Math.max(...durations) : 0
    const avgMs = durations.length ? Math.round(totalMs / durations.length) : 0
    const errors = uniqueErrors(results.flatMap((result) => result.errors))

    batches.push({
      index: index + 1,
      ok: okCount,
      error: errorCount,
      minMs,
      maxMs,
      avgMs,
      errors,
    })
  }

  return {
    concurrency,
    iterations,
    startedAt,
    finishedAt: new Date().toISOString(),
    batches,
  }
}
