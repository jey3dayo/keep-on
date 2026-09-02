import { getKV } from '@/lib/cache/kv'
import { formatError, logInfo, logWarn, summarizeIssues } from '@/lib/logging'
import { safeParseUser } from '@/schemas/user'
import type { User } from '@/types/user'

const CACHE_TTL_SECONDS = 300 // 5分
const CACHE_KEY_PREFIX = 'user:external:'

function getCacheKey(externalId: string): string {
  return `${CACHE_KEY_PREFIX}${externalId}`
}

export async function getUserFromCache(externalId: string): Promise<User | null> {
  const kv = await getKV()
  if (!kv) {
    return null
  }

  try {
    const key = getCacheKey(externalId)
    const cached = await kv.get(key, 'text')

    if (!cached) {
      logInfo('user.cache:miss', { externalId })
      return null
    }

    const parsed = safeParseUser(JSON.parse(cached))
    if (!parsed.success) {
      // 旧スキーマのキャッシュ（新フィールド追加前など）はキャッシュ破損ではなくスキーマ変化。
      // DB から再取得させれば TTL 経過後に新形式で上書きされるため warn に留める
      logWarn('user.cache:schema-mismatch', { externalId, issues: summarizeIssues(parsed.issues) })
      return null
    }
    logInfo('user.cache:hit', { externalId })
    return parsed.output
  } catch (error) {
    logWarn('user.cache:error', { error: formatError(error), externalId })
    return null
  }
}

export async function setUserCache(externalId: string, user: User): Promise<void> {
  const kv = await getKV()
  if (!kv) {
    return
  }

  try {
    const key = getCacheKey(externalId)
    await kv.put(key, JSON.stringify(user), {
      expirationTtl: CACHE_TTL_SECONDS,
    })
    logInfo('user.cache:set', { externalId, ttl: CACHE_TTL_SECONDS })
  } catch (error) {
    logWarn('user.cache:set:error', { error: formatError(error), externalId })
  }
}

export async function invalidateUserCache(externalId: string): Promise<void> {
  const kv = await getKV()
  if (!kv) {
    return
  }

  try {
    const key = getCacheKey(externalId)
    await kv.delete(key)
    logInfo('user.cache:invalidate', { externalId })
  } catch (error) {
    logWarn('user.cache:invalidate:error', { error: formatError(error), externalId })
  }
}
