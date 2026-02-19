import type { CloudflareEnv, KVNamespace } from '@/types/cloudflare'

/**
 * Cloudflare KV Namespace を取得する共通ユーティリティ
 * ローカル環境では null を返す
 */
export async function getKV(): Promise<KVNamespace | null> {
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
