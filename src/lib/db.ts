import { getCloudflareContext } from '@opennextjs/cloudflare'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '@/db/schema'
import { logError, logInfo } from '@/lib/logging'

let cachedDb: ReturnType<typeof drizzle> | null = null

export function getDb() {
  if (cachedDb) {
    return cachedDb
  }

  try {
    const { env } = getCloudflareContext()
    const d1Database = (env as { DB?: D1Database }).DB

    if (!d1Database) {
      throw new Error('D1 database binding not found')
    }

    logInfo('db.connection', { source: 'd1' })
    cachedDb = drizzle(d1Database, { schema })
    return cachedDb
  } catch (error) {
    logError('db.connection:error', { error })
    throw error
  }
}

export function resetDb() {
  cachedDb = null
}
