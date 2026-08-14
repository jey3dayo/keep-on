import * as Sentry from '@sentry/nextjs'

const tracesSampleRate = process.env.NODE_ENV === 'production' ? 0.1 : 1.0

export function register() {
  const dsn = process.env.SENTRY_DSN

  if (!dsn) {
    console.warn('SENTRY_DSN is not set. Sentry will not be initialized.')
    return
  }

  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn,
      tracesSampleRate,
    })
  }
}

export const onRequestError = Sentry.captureRequestError
