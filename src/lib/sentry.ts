import * as Sentry from '@sentry/nextjs'

type SentryLevel = 'info' | 'warning' | 'error'

/**
 * エラーを Sentry に送信する。`context` は extra データとして付与される。
 * `fingerprint` はグルーピング制御に使われるため extra ではなく Sentry の同名フィールドへ渡す。
 */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!context) {
    Sentry.captureException(error)
    return
  }

  const { fingerprint, ...extra } = context
  Sentry.captureException(error, {
    extra,
    ...(Array.isArray(fingerprint) ? { fingerprint: fingerprint.map(String) } : {}),
  })
}

/**
 * メッセージを Sentry に送信する。
 */
export function captureMessage(message: string, level: SentryLevel = 'info'): void {
  Sentry.captureMessage(message, level)
}

interface SentryScopeOptions {
  context?: Record<string, unknown>
  tags?: Record<string, string>
}

/**
 * Sentry のスコープ（tags / context）を設定した状態で `fn` を実行する。
 * `fn` がエラーを throw した場合は Sentry に送信したうえで再 throw する。
 */
export async function withSentryScope<T>(fn: () => Promise<T>, options?: SentryScopeOptions): Promise<T> {
  return await Sentry.withScope(async (scope) => {
    if (options?.tags) {
      for (const [key, value] of Object.entries(options.tags)) {
        scope.setTag(key, value)
      }
    }
    if (options?.context) {
      scope.setContext('additionalContext', options.context)
    }

    try {
      return await fn()
    } catch (error) {
      Sentry.captureException(error)
      throw error
    }
  })
}
