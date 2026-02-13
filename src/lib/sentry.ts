import {
  captureException as sentryCaptureException,
  captureMessage as sentryCaptureMessage,
  setContext,
  setTag,
  withScope,
} from '@sentry/cloudflare'

/**
 * Sentry が初期化されているかチェック
 */
function isSentryEnabled(): boolean {
  // SENTRY_DSN が環境変数に設定されているか確認
  return typeof process !== 'undefined' && Boolean(process.env.SENTRY_DSN)
}

/**
 * Sentry スコープ内でハンドラーを実行
 */
export async function withSentryScope<T>(
  handler: () => Promise<T> | T,
  options?: {
    tags?: Record<string, string>
    context?: Record<string, unknown>
  }
): Promise<T> {
  if (!isSentryEnabled()) {
    return handler()
  }

  return withScope(async () => {
    // タグを追加
    if (options?.tags) {
      for (const [key, value] of Object.entries(options.tags)) {
        setTag(key, value)
      }
    }

    // コンテキストを追加
    if (options?.context) {
      setContext('custom', options.context)
    }

    try {
      return await handler()
    } catch (error) {
      // エラーをキャプチャ
      sentryCaptureException(error)
      throw error
    }
  })
}

/**
 * カスタムエラーをSentryに送信
 */
export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!isSentryEnabled()) {
    console.error('Sentry not initialized:', error, context)
    return
  }

  if (context) {
    setContext('custom', context)
  }

  sentryCaptureException(error)
}

/**
 * カスタムメッセージをSentryに送信
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (!isSentryEnabled()) {
    console.log(`Sentry not initialized: [${level}] ${message}`)
    return
  }

  sentryCaptureMessage(message, level)
}
