import * as v from 'valibot'
import { formatError, logInfo, logWarn } from '@/lib/logging'
import { HabitsCacheDataSchema } from '@/schemas/cache'
import type { CloudflareEnv, KVNamespace } from '@/types/cloudflare'
import type { HabitWithProgress } from '@/types/habit'

export interface HabitsCacheData {
  habits: HabitWithProgress[]
  dateKey: string
  timestamp: number
  staleAt?: number
}

const CACHE_TTL_SECONDS = 180 // 3分（チェックイン更新頻度を考慮）
const CACHE_KEY_PREFIX = 'habits:user:'

function getCacheKey(userId: string): string {
  return `${CACHE_KEY_PREFIX}${userId}`
}

async function getKV(): Promise<KVNamespace | null> {
  if (typeof globalThis === 'undefined' || !('caches' in globalThis)) {
    return null // ローカル環境
  }

  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    const { env } = getCloudflareContext()
    const kv = (env as CloudflareEnv).NEXT_INC_CACHE_KV
    return kv || null
  } catch {
    return null
  }
}

export async function getHabitsCacheSnapshot(userId: string): Promise<HabitsCacheData | null> {
  const kv = await getKV()
  if (!kv) {
    return null
  }

  try {
    const key = getCacheKey(userId)
    const cached = await kv.get(key, 'json')

    if (!cached) {
      return null
    }

    const parseResult = v.safeParse(HabitsCacheDataSchema, cached)

    if (!parseResult.success) {
      logWarn('habit-cache:invalid-data', {
        userId,
        error: 'Schema validation failed',
        issues: parseResult.issues,
      })
      return null
    }

    return parseResult.output as HabitsCacheData
  } catch (error) {
    logWarn('habit-cache:error:read', { userId, error: formatError(error) })
    return null
  }
}

export async function getHabitsFromCache(userId: string, dateKey: string): Promise<HabitWithProgress[] | null> {
  const kv = await getKV()
  if (!kv) {
    return null
  }

  const snapshot = await getHabitsCacheSnapshot(userId)
  if (!snapshot) {
    logInfo('habit-cache:miss', { userId })
    return null
  }

  if (snapshot.staleAt) {
    logInfo('habit-cache:stale', {
      userId,
      cachedDateKey: snapshot.dateKey,
      requestedDateKey: dateKey,
      reason: 'invalidated',
    })
    return null
  }

  if (snapshot.dateKey !== dateKey) {
    logInfo('habit-cache:stale', {
      userId,
      cachedDateKey: snapshot.dateKey,
      requestedDateKey: dateKey,
      reason: 'date-key',
    })
    return null
  }

  logInfo('habit-cache:hit', { userId, habitCount: snapshot.habits.length })
  return snapshot.habits as HabitWithProgress[]
}

export async function setHabitsCache(userId: string, dateKey: string, habits: HabitWithProgress[]): Promise<void> {
  const kv = await getKV()
  if (!kv) {
    return
  }

  try {
    const key = getCacheKey(userId)
    const data: HabitsCacheData = {
      habits,
      dateKey,
      timestamp: Date.now(),
    }

    await kv.put(key, JSON.stringify(data), {
      expirationTtl: CACHE_TTL_SECONDS,
    })

    logInfo('habit-cache:set', { userId, habitCount: habits.length, ttl: CACHE_TTL_SECONDS })
  } catch (error) {
    logWarn('habit-cache:error:write', { userId, error: formatError(error) })
  }
}

export async function invalidateHabitsCache(userId: string): Promise<void> {
  const kv = await getKV()
  if (!kv) {
    return
  }

  try {
    const key = getCacheKey(userId)
    const cached = await kv.get(key, 'json')
    if (!cached) {
      logInfo('habit-cache:invalidate:miss', { userId })
      return
    }

    const parseResult = v.safeParse(HabitsCacheDataSchema, cached)
    if (!parseResult.success) {
      await kv.delete(key)
      logWarn('habit-cache:invalidate:drop', {
        userId,
        error: 'Schema validation failed',
        issues: parseResult.issues,
      })
      return
    }

    const data = parseResult.output as HabitsCacheData
    const staleData: HabitsCacheData = {
      ...data,
      staleAt: Date.now(),
    }

    await kv.put(key, JSON.stringify(staleData), {
      expirationTtl: CACHE_TTL_SECONDS,
    })

    logInfo('habit-cache:invalidate:stale', {
      userId,
      mode: 'stale',
      cachedDateKey: data.dateKey,
      staleAt: staleData.staleAt,
    })
  } catch (error) {
    // KV delete のエラーは通常発生しないが、念のためログに記録
    logWarn('habit-cache:error:invalidate', { userId, error: formatError(error) })
    // エラーを上位に伝播させない（キャッシュ無効化の失敗は致命的ではない）
  }
}
