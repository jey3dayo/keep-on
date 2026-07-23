import * as v from 'valibot'
import { getKV } from '@/lib/cache/kv'
import { formatError, logInfo, logWarn } from '@/lib/logging'
import { HabitsCacheDataSchema } from '@/schemas/cache'
import type { HabitWithProgress } from '@/types/habit'

interface HabitsCacheData {
  dateKey: string
  habits: HabitWithProgress[]
  staleAt?: number
  timestamp: number
}

const CACHE_TTL_SECONDS = 180 // 3分（チェックイン更新頻度を考慮）
const CACHE_KEY_PREFIX = 'habits:user:'

function getCacheKey(userId: string): string {
  return `${CACHE_KEY_PREFIX}${userId}`
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
        error: 'Schema validation failed',
        issues: parseResult.issues,
        userId,
      })
      return null
    }

    return parseResult.output as HabitsCacheData
  } catch (error) {
    logWarn('habit-cache:error:read', { error: formatError(error), userId })
    return null
  }
}

export async function setHabitsCache(userId: string, dateKey: string, habits: HabitWithProgress[]): Promise<void> {
  const kv = await getKV()
  if (!kv) {
    return
  }

  try {
    const key = getCacheKey(userId)
    const data: HabitsCacheData = {
      dateKey,
      habits,
      timestamp: Date.now(),
    }

    await kv.put(key, JSON.stringify(data), {
      expirationTtl: CACHE_TTL_SECONDS,
    })

    logInfo('habit-cache:set', { habitCount: habits.length, ttl: CACHE_TTL_SECONDS, userId })
  } catch (error) {
    logWarn('habit-cache:error:write', { error: formatError(error), userId })
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
        error: 'Schema validation failed',
        issues: parseResult.issues,
        userId,
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
      cachedDateKey: data.dateKey,
      mode: 'stale',
      staleAt: staleData.staleAt,
      userId,
    })
  } catch (error) {
    // KV delete のエラーは通常発生しないが、念のためログに記録
    logWarn('habit-cache:error:invalidate', { error: formatError(error), userId })
    // エラーを上位に伝播させない（キャッシュ無効化の失敗は致命的ではない）
  }
}
