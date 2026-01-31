import { formatError, logInfo, logWarn } from '@/lib/logging'
import type { User } from '@/types/user'

// Cloudflare Workers KVNamespace型（グローバル型として存在）
interface KVNamespace {
  get(key: string, type: 'text'): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}

interface CloudflareEnv {
  NEXT_INC_CACHE_KV?: KVNamespace
}

const CACHE_TTL_SECONDS = 300 // 5分
const CACHE_KEY_PREFIX = 'user:clerk:'

function getCacheKey(clerkId: string): string {
  return `${CACHE_KEY_PREFIX}${clerkId}`
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

export async function getUserFromCache(clerkId: string): Promise<User | null> {
  const kv = await getKV()
  if (!kv) {
    return null
  }

  try {
    const key = getCacheKey(clerkId)
    const cached = await kv.get(key, 'text')

    if (!cached) {
      logInfo('user.cache:miss', { clerkId })
      return null
    }

    const user = JSON.parse(cached) as User
    logInfo('user.cache:hit', { clerkId })
    return user
  } catch (error) {
    logWarn('user.cache:error', { clerkId, error: formatError(error) })
    return null
  }
}

export async function setUserCache(clerkId: string, user: User): Promise<void> {
  const kv = await getKV()
  if (!kv) {
    return
  }

  try {
    const key = getCacheKey(clerkId)
    await kv.put(key, JSON.stringify(user), {
      expirationTtl: CACHE_TTL_SECONDS,
    })
    logInfo('user.cache:set', { clerkId, ttl: CACHE_TTL_SECONDS })
  } catch (error) {
    logWarn('user.cache:set:error', { clerkId, error: formatError(error) })
  }
}

export async function invalidateUserCache(clerkId: string): Promise<void> {
  const kv = await getKV()
  if (!kv) {
    return
  }

  try {
    const key = getCacheKey(clerkId)
    await kv.delete(key)
    logInfo('user.cache:invalidate', { clerkId })
  } catch (error) {
    logWarn('user.cache:invalidate:error', { clerkId, error: formatError(error) })
  }
}
