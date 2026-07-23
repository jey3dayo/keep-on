import { ANALYTICS_CACHE_TTL_SECONDS } from '@/constants/cache'
import { buildCacheKey, serializeCacheData, validateCachedData } from '@/lib/cache/analytics-cache.pure'
import { getKV } from '@/lib/cache/kv'
import { formatError, logInfo, logWarn } from '@/lib/logging'

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
    const key = buildCacheKey(userId)
    const cached = await kv.get(key, 'json')

    if (cached === null) {
      logInfo('analytics-cache:miss', { userId })
      return null
    }

    // KVから取得したデータをバリデーション
    const total = validateCachedData(cached)

    if (total === null) {
      logWarn('analytics-cache:invalid-data', {
        error: 'Schema validation failed',
        userId,
      })
      return null
    }

    logInfo('analytics-cache:hit', { totalCheckins: total, userId })
    return total
  } catch (error) {
    logWarn('analytics-cache:error:read', {
      error: formatError(error),
      userId,
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
    const key = buildCacheKey(userId)
    const value = serializeCacheData(total)
    await kv.put(key, value, {
      expirationTtl: ANALYTICS_CACHE_TTL_SECONDS,
    })
    logInfo('analytics-cache:set', { total, ttl: ANALYTICS_CACHE_TTL_SECONDS, userId })
  } catch (error) {
    logWarn('analytics-cache:error:write', {
      error: formatError(error),
      userId,
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
    const key = buildCacheKey(userId)
    await kv.delete(key)
    logInfo('analytics-cache:invalidate', { userId })
  } catch (error) {
    logWarn('analytics-cache:error:invalidate', {
      error: formatError(error),
      userId,
    })
  }
}
