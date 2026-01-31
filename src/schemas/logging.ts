import * as v from 'valibot'

/**
 * ログレベルのスキーマ
 */
export const LogLevelSchema = v.union([v.literal('debug'), v.literal('info'), v.literal('warn'), v.literal('error')])

export type LogLevel = v.InferOutput<typeof LogLevelSchema>

/**
 * エラーオブジェクトのスキーマ
 */
export const ErrorObjectSchema = v.object({
  name: v.string(),
  message: v.string(),
})

/**
 * プロセス環境変数のスキーマ（LOG_LEVEL用）
 */
export const ProcessEnvSchema = v.object({
  LOG_LEVEL: v.optional(v.string()),
})

/**
 * グローバルオブジェクトのスキーマ（process.env用）
 */
export const GlobalWithProcessSchema = v.object({
  process: v.optional(
    v.object({
      env: v.optional(v.record(v.string(), v.optional(v.string()))),
    })
  ),
})

/**
 * LOG_LEVELをパースして型安全なLogLevelを返す
 */
export function parseLogLevel(rawLevel: unknown): LogLevel {
  if (typeof rawLevel !== 'string') {
    return 'info'
  }

  const parseResult = v.safeParse(LogLevelSchema, rawLevel.toLowerCase())
  return parseResult.success ? parseResult.output : 'info'
}

/**
 * エラーオブジェクトをフォーマット
 */
export function formatErrorObject(error: unknown): { name: string; message: string } {
  const parseResult = v.safeParse(ErrorObjectSchema, error)

  if (parseResult.success) {
    return parseResult.output
  }

  // Error インスタンスの場合
  if (error instanceof Error) {
    return { name: error.name, message: error.message }
  }

  // その他の場合
  return { name: 'UnknownError', message: String(error) }
}
