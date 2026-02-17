import * as v from 'valibot'

/**
 * KV Namespace バインディングのスキーマ（実行時検証用）
 *
 * 注: KVNamespace は実行時にメソッドが存在することのみを検証する
 * 実際の型定義は src/types/cloudflare.ts を参照
 */
export const KVNamespaceBindingSchema = v.custom<unknown>((value) => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'get' in value &&
    'put' in value &&
    'delete' in value &&
    typeof (value as { get: unknown }).get === 'function' &&
    typeof (value as { put: unknown }).put === 'function' &&
    typeof (value as { delete: unknown }).delete === 'function'
  )
}, 'KV Namespace バインディングが無効です')

/**
 * Cloudflare Workers 環境変数のスキーマ
 */
export const CloudflareEnvBindingsSchema = v.object({
  NEXT_INC_CACHE_KV: v.optional(KVNamespaceBindingSchema),
})

export type CloudflareEnvBindings = v.InferOutput<typeof CloudflareEnvBindingsSchema>

/**
 * Cloudflare Workers 環境変数の安全なパース
 */
export function safeParseCloudflareEnvBindings(input: unknown) {
  return v.safeParse(CloudflareEnvBindingsSchema, input)
}
