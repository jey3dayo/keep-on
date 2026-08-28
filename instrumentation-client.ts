import * as Sentry from '@sentry/nextjs'

const tracesSampleRate = process.env.NODE_ENV === 'production' ? 0.1 : 1.0

// サーバー側（instrumentation.ts）と同じ方針: development では既定で送信しない。
// ローカル検証時のみ NEXT_PUBLIC_SENTRY_ENABLE_DEV=true で有効化する（ビルド時に焼き込み）。
const enabled = process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_SENTRY_ENABLE_DEV === 'true'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    enabled,
    tracesSampleRate,
  })
} else {
  console.warn('NEXT_PUBLIC_SENTRY_DSN is not set. Sentry will not be initialized.')
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
