import * as v from 'valibot'
import { ANALYTICS_CACHE_KEY_PREFIX } from '@/constants/cache'
import { TotalCheckinsSchema } from '@/schemas/cache'

/**
 * 純粋関数（テスト可能）
 * 副作用なし、外部依存なし
 */

/**
 * ユーザーIDからキャッシュキーを生成
 */
export function buildCacheKey(userId: string): string {
  return `${ANALYTICS_CACHE_KEY_PREFIX}${userId}`
}

/**
 * キャッシュデータをJSON文字列に変換
 */
export function serializeCacheData(total: number): string {
  return JSON.stringify({ total, timestamp: Date.now() })
}

/**
 * KVから取得したデータをバリデーション
 *
 * @returns 検証成功時は総チェックイン数、失敗時は null
 */
export function validateCachedData(data: unknown): number | null {
  if (data === null || data === undefined) {
    return null
  }

  const parseResult = v.safeParse(TotalCheckinsSchema, data)

  if (!parseResult.success) {
    return null
  }

  return parseResult.output.total
}
