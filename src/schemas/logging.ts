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
 * Cause オブジェクトのスキーマ（1レベルのみ）
 */
const CauseSchema = v.object({
  message: v.optional(v.string()),
  code: v.optional(v.string()),
})

/**
 * PostgresError 風の詳細エラースキーマ
 */
const DetailedErrorSchema = v.object({
  name: v.optional(v.string()),
  message: v.string(),
  code: v.optional(v.string()),
  severity: v.optional(v.string()),
  constraint_name: v.optional(v.string()),
  table_name: v.optional(v.string()),
  column_name: v.optional(v.string()),
  schema_name: v.optional(v.string()),
  query: v.optional(v.string()),
  cause: v.optional(CauseSchema),
})

/**
 * フォーマットされたエラーオブジェクトの型
 */
export type FormattedError = v.InferOutput<typeof DetailedErrorSchema> & { name: string }

/**
 * エラーオブジェクトをフォーマット
 * PostgresError や他のDBエラーの詳細フィールドも抽出する
 */
export function formatErrorObject(error: unknown): FormattedError {
  // 非オブジェクトの場合
  if (typeof error !== 'object' || error === null) {
    return { name: 'UnknownError', message: String(error) }
  }

  // Error インスタンスの場合
  if (error instanceof Error) {
    const parsed = v.safeParse(DetailedErrorSchema, {
      name: error.name,
      message: error.message,
      cause: error.cause,
    })
    if (parsed.success) {
      return { name: error.name, ...parsed.output }
    }
    return { name: error.name, message: error.message }
  }

  // オブジェクトの場合（PostgresError など）
  const parsed = v.safeParse(DetailedErrorSchema, error)
  if (parsed.success) {
    const result = parsed.output
    // query は200文字に切り詰める
    if (result.query && result.query.length > 200) {
      result.query = `${result.query.slice(0, 200)}...`
    }
    // 空文字のフィールドを削除
    for (const key of Object.keys(result)) {
      if (result[key as keyof typeof result] === '') {
        delete result[key as keyof typeof result]
      }
    }
    return { name: result.name ?? 'Error', ...result }
  }

  // パース失敗時は基本情報のみ
  return { name: 'Error', message: String(error) }
}
