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
  code: v.optional(v.string()),
})

/**
 * エラーメッセージとコードから接続エラータイプを推論
 *
 * 大文字・小文字を区別せずにメッセージをチェックし、
 * error.code も参照してより正確な分類を行う
 */
export function classifyConnectionError(error: unknown): ConnectionErrorType {
  // エラーオブジェクトの検証
  const errorResult = v.safeParse(ErrorWithMessageSchema, error)
  if (!errorResult.success) {
    return 'unknown'
  }

  const message = errorResult.output.message.toLowerCase()
  const code = errorResult.output.code?.toUpperCase()

  // error.code による分類（優先）
  if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT') {
    return 'timeout'
  }
  if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'EHOSTUNREACH') {
    return 'network'
  }
  if (code === 'ECONNRESET' || code === 'EPIPE' || code === 'ECONNABORTED') {
    return 'connection'
  }

  // エラーメッセージのパターンマッチング（小文字化して大文字・小文字を無視）
  if (message.includes('timeout') || message.includes('timed out')) {
    return 'timeout'
  }
  if (
    message.includes('econnrefused') ||
    message.includes('enotfound') ||
    message.includes('host') ||
    message.includes('dns')
  ) {
    return 'network'
  }
  if (message.includes('authentication') || message.includes('password') || message.includes('login')) {
    return 'auth'
  }
  if (
    message.includes('econnreset') ||
    message.includes('connection') ||
    message.includes('terminated') ||
    message.includes('closed') ||
    message.includes('epipe')
  ) {
    return 'connection'
  }

  return 'unknown'
}
