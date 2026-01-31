import * as v from 'valibot'
import { ANALYTICS_CACHE_KEY_PREFIX, ANALYTICS_CACHE_TTL_SECONDS } from '@/constants/cache'
import { formatError, logInfo, logWarn } from '@/lib/logging'
import { TotalCheckinsSchema } from '@/schemas/cache'
import type { CloudflareEnv, KVNamespace } from '@/types/cloudflare'

async function getKV(): Promise<KVNamespace | null> {
  if (typeof globalThis === 'undefined' || !('caches' in globalThis)) {
    return null // ローカル環境
  }

  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    const { env } = getCloudflareContext()
    return (env as CloudflareEnv).NEXT_INC_CACHE_KV ?? null
  } catch {
    return null
  }
}

/**
 * 総チェックイン数をキャッシュから取得
 *
 * @param userId - ユーザーID
 * @returns キャッシュされた総チェックイン数、またはnull（キャッシュミス時）
 */
export async function getTotalCheckinsFromCache(userId: string): Promise<number | null> {
  const kv = await getKV()
  if (!kv) {
    return null
  }

  try {
    const key = `${ANALYTICS_CACHE_KEY_PREFIX}${userId}`
    const cached = await kv.get(key, 'json')

    if (cached === null) {
      logInfo('analytics-cache:miss', { userId })
      return null
    }

    // KVから取得したデータをバリデーション
    const parseResult = v.safeParse(TotalCheckinsSchema, cached)

    if (!parseResult.success) {
      logWarn('analytics-cache:invalid-data', {
        userId,
        error: 'Schema validation failed',
        issues: parseResult.issues,
      })
      return null
    }

    logInfo('analytics-cache:hit', { userId, totalCheckins: parseResult.output.total })
    return parseResult.output.total
  } catch (error) {
    logWarn('analytics-cache:error:read', {
      userId,
      error: formatError(error),
    })
    return null
  }
}

/**
 * 総チェックイン数をキャッシュに保存
 *
 * @param userId - ユーザーID
 * @param total - 総チェックイン数
 */
export async function setTotalCheckinsCache(userId: string, total: number): Promise<void> {
  const kv = await getKV()
  if (!kv) {
    return
  }

  try {
    const key = `${ANALYTICS_CACHE_KEY_PREFIX}${userId}`
    await kv.put(key, JSON.stringify({ total, timestamp: Date.now() }), {
      expirationTtl: ANALYTICS_CACHE_TTL_SECONDS,
    })
    logInfo('analytics-cache:set', { userId, total, ttl: ANALYTICS_CACHE_TTL_SECONDS })
  } catch (error) {
    logWarn('analytics-cache:error:write', {
      userId,
      error: formatError(error),
    })
  }
}

/**
 * アナリティクスキャッシュを無効化
 *
 * @param userId - ユーザーID
 */
export async function invalidateAnalyticsCache(userId: string): Promise<void> {
  const kv = await getKV()
  if (!kv) {
    return
  }

  try {
    const key = `${ANALYTICS_CACHE_KEY_PREFIX}${userId}`
    await kv.delete(key)
    logInfo('analytics-cache:invalidate', { userId })
  } catch (error) {
    logWarn('analytics-cache:error:invalidate', {
      userId,
      error: formatError(error),
    })
  }
}
