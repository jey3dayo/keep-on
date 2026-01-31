import { formatError, logInfo, logWarn } from '@/lib/logging'

interface KVNamespace {
  get(key: string, type: 'json'): Promise<{ total: number; timestamp: number } | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}

interface CloudflareEnv {
  NEXT_INC_CACHE_KV?: KVNamespace
}

const CACHE_TTL_SECONDS = 300 // 5分
const CACHE_KEY_PREFIX = 'analytics:total-checkins:'

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
    const key = `${CACHE_KEY_PREFIX}${userId}`
    const cached = await kv.get(key, 'json')

    if (cached === null) {
      logInfo('analytics-cache:miss', { userId })
      return null
    }

    logInfo('analytics-cache:hit', { userId, totalCheckins: (cached as { total: number }).total })
    return (cached as { total: number }).total
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
    const key = `${CACHE_KEY_PREFIX}${userId}`
    await kv.put(key, JSON.stringify({ total, timestamp: Date.now() }), {
      expirationTtl: CACHE_TTL_SECONDS,
    })
    logInfo('analytics-cache:set', { userId, total, ttl: CACHE_TTL_SECONDS })
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
    const key = `${CACHE_KEY_PREFIX}${userId}`
    await kv.delete(key)
    logInfo('analytics-cache:invalidate', { userId })
  } catch (error) {
    logWarn('analytics-cache:error:invalidate', {
      userId,
      error: formatError(error),
    })
  }
}
