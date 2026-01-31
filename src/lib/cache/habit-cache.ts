import * as v from 'valibot'
import { formatError, logInfo, logWarn } from '@/lib/logging'
import { HabitsCacheDataSchema } from '@/schemas/cache'
import type { CloudflareEnv, KVNamespace } from '@/types/cloudflare'
import type { HabitWithProgress } from '@/types/habit'

interface HabitsCacheData {
  habits: HabitWithProgress[]
  dateKey: string
  timestamp: number
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

export async function getHabitsFromCache(userId: string, dateKey: string): Promise<HabitWithProgress[] | null> {
  const kv = await getKV()
  if (!kv) {
    return null
  }

  try {
    const key = getCacheKey(userId)
    const cached = await kv.get(key, 'json')

    if (!cached) {
      logInfo('habit-cache:miss', { userId })
      return null
    }

    // KVから取得したデータをバリデーション
    const parseResult = v.safeParse(HabitsCacheDataSchema, cached)

    if (!parseResult.success) {
      logWarn('habit-cache:invalid-data', {
        userId,
        error: 'Schema validation failed',
        issues: parseResult.issues,
      })
      return null
    }

    const validated = parseResult.output

    // dateKey 検証（現在の期間と一致するか）
    if (validated.dateKey !== dateKey) {
      logInfo('habit-cache:stale', { userId, cachedDateKey: validated.dateKey, requestedDateKey: dateKey })
      await kv.delete(key)
      return null
    }

    logInfo('habit-cache:hit', { userId, habitCount: validated.habits.length })
    return validated.habits as HabitWithProgress[]
  } catch (error) {
    logWarn('habit-cache:error:read', { userId, error: formatError(error) })
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
    // KV delete は冪等で、存在しないキーに対しても安全に実行可能
    await kv.delete(key)
    logInfo('habit-cache:invalidate', { userId })
  } catch (error) {
    // KV delete のエラーは通常発生しないが、念のためログに記録
    logWarn('habit-cache:error:invalidate', { userId, error: formatError(error) })
    // エラーを上位に伝播させない（キャッシュ無効化の失敗は致命的ではない）
  }
}
