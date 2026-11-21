import { ApiClientError } from '@aced/api-client'

/** A message for users from an API error. */
export function apiErrorMessage(
  err: unknown,
  fallback = 'Something went wrong. Try again.',
): string {
  if (!(err instanceof ApiClientError)) return fallback
  if (err.code === 'rate_limited' && err.retryAfter) {
    const minutes = Math.ceil(err.retryAfter / 60)
    return `You're doing that too often. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`
  }
  if (err.code === 'banned') return err.message
  if (err.status < 500) return err.message
  return fallback
}
