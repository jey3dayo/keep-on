import * as v from 'valibot'

/**
 * データベース接続エラータイプのスキーマ
 */
export const ConnectionErrorTypeSchema = v.union([
  v.literal('timeout'),
  v.literal('network'),
  v.literal('auth'),
  v.literal('connection'),
  v.literal('unknown'),
])

export type ConnectionErrorType = v.InferOutput<typeof ConnectionErrorTypeSchema>

/**
 * エラーオブジェクトのスキーマ（メッセージプロパティを持つ）
 */
export const ErrorWithMessageSchema = v.object({
  message: v.string(),
})

/**
 * エラーメッセージから接続エラータイプを推論
 */
export function classifyConnectionError(error: unknown): ConnectionErrorType {
  // エラーオブジェクトの検証
  const errorResult = v.safeParse(ErrorWithMessageSchema, error)
  if (!errorResult.success) {
    return 'unknown'
  }

  const message = errorResult.output.message

  // エラーメッセージのパターンマッチング
  if (message.includes('timeout')) {
    return 'timeout'
  }
  if (message.includes('ECONNREFUSED') || message.includes('ENOTFOUND')) {
    return 'network'
  }
  if (message.includes('authentication') || message.includes('password')) {
    return 'auth'
  }
  if (message.includes('ECONNRESET') || message.includes('connection')) {
    return 'connection'
  }

  return 'unknown'
}
