import * as Sentry from '@sentry/nextjs'

export function register() {
  // Off unless a DSN is set, so local dev and CI run without Sentry.
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN })
}

export const onRequestError = Sentry.captureRequestError
