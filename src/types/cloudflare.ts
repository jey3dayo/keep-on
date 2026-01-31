/**
 * Cloudflare Workers 環境変数の型定義
 */

/** KV Namespace インターフェース */
export interface KVNamespace {
  get(key: string, type?: 'text'): Promise<string | null>
  get(key: string, type: 'json'): Promise<unknown>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}

/** Cloudflare Workers 環境変数 */
export interface CloudflareEnv {
  /** Incremental Cache用のKV Namespace */
  NEXT_INC_CACHE_KV?: KVNamespace
  /** Hyperdrive接続情報 */
  HYPERDRIVE?: { connectionString: string }
}
