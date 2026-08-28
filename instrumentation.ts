import * as Sentry from '@sentry/nextjs'

const tracesSampleRate = process.env.NODE_ENV === 'production' ? 0.1 : 1.0

// ローカル dev の一時的なエラー（HMR の中間状態など）が本番と同じアラートに乗るのを防ぐため、
// development では既定で送信しない。Sentry 統合自体をローカル検証したいときだけ
// SENTRY_ENABLE_DEV=true で明示的に有効化する。
const enabled = process.env.NODE_ENV === 'production' || process.env.SENTRY_ENABLE_DEV === 'true'

export function register() {
  const dsn = process.env.SENTRY_DSN

  if (!dsn) {
    console.warn('SENTRY_DSN is not set. Sentry will not be initialized.')
    return
  }

  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn,
      enabled,
      tracesSampleRate,
    })
  }
}

export const onRequestError = Sentry.captureRequestError
