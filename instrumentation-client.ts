import * as Sentry from '@sentry/nextjs'

const tracesSampleRate = process.env.NODE_ENV === 'production' ? 0.1 : 1.0

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate,
  })
} else {
  console.warn('NEXT_PUBLIC_SENTRY_DSN is not set. Sentry will not be initialized.')
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
