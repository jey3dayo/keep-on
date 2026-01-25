import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@/db/schema'
import { PgbouncerParamSchema } from '@/schemas/db'

interface ConnectionInfo {
  connectionString: string
  usePgbouncer: boolean
}

function normalizeConnectionString(raw: string): ConnectionInfo {
  try {
    const url = new URL(raw)
    const pgbouncerParam = url.searchParams.get('pgbouncer')
    const usePgbouncer = PgbouncerParamSchema.parse(pgbouncerParam)

    if (pgbouncerParam !== null) {
      url.searchParams.delete('pgbouncer')
    }

    return { connectionString: url.toString(), usePgbouncer }
  } catch {
    return { connectionString: raw, usePgbouncer: false }
  }
}

async function getConnectionString(): Promise<string> {
  // Cloudflare Workers環境でHyperdriveが利用可能な場合
  if (typeof globalThis !== 'undefined' && 'caches' in globalThis) {
    try {
      const { getCloudflareContext } = await import('@opennextjs/cloudflare')
      const { env } = getCloudflareContext()
      const hyperdrive = (env as { HYPERDRIVE?: { connectionString: string } }).HYPERDRIVE
      if (hyperdrive?.connectionString) {
        return hyperdrive.connectionString
      }
    } catch {
      // Hyperdrive未設定の場合はフォールバック
    }
  }

  // ローカル開発環境ではDATABASE_URLを使用
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined')
  }
  return process.env.DATABASE_URL
}

async function createDb() {
  const rawConnectionString = await getConnectionString()
  const { connectionString, usePgbouncer } = normalizeConnectionString(rawConnectionString)
  const client = usePgbouncer ? postgres(connectionString, { prepare: false, max: 1 }) : postgres(connectionString)
  return drizzle(client, { schema })
}

type DbPromise = ReturnType<typeof createDb>

const globalForDb = globalThis as typeof globalThis & {
  __dbPromise?: DbPromise
}

export function getDb() {
  if (!globalForDb.__dbPromise) {
    globalForDb.__dbPromise = createDb()
  }

  return globalForDb.__dbPromise
}

export type DbClient = Awaited<ReturnType<typeof getDb>>
