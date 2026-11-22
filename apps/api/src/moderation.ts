import type { UserRow } from '@aced/db'
import { containsBlockedWord } from '@aced/moderation'
import type { FastifyInstance } from 'fastify'
import { HttpError } from './errors.js'

export function assertClean(...texts: (string | null | undefined)[]) {
  if (texts.some((t) => t && containsBlockedWord(t))) {
    throw new HttpError(422, 'content_blocked', "That contains words that aren't allowed here")
  }
}

const HOURLY_LIMITS = { post: 5, comment: 30, vote: 300, report: 10, follow: 60 }
const WINDOW_SECONDS = 3600
export const NEW_ACCOUNT_MS = 7 * 24 * 60 * 60 * 1000

/** Fixed-window rate limit per user and action; accounts under 7 days old get half. */
export async function rateLimit(
  app: FastifyInstance,
  user: UserRow,
  action: keyof typeof HOURLY_LIMITS,
) {
  if (!app.rateLimits) return
  const isNew = Date.now() - user.createdAt.getTime() < NEW_ACCOUNT_MS
  const limit = isNew ? Math.floor(HOURLY_LIMITS[action] / 2) : HOURLY_LIMITS[action]
  const now = Math.floor(Date.now() / 1000)
  const windowStart = now - (now % WINDOW_SECONDS)
  const key = `rl:${action}:${user.id}:${windowStart}`

  let count: number
  try {
    const [[, incr] = []] =
      (await app.redis.multi().incr(key).expire(key, WINDOW_SECONDS).exec()) ?? []
    count = Number(incr)
  } catch (err) {
    // Fail open: a Redis outage shouldn't block every write.
    app.log.warn({ err }, 'rate limit check failed')
    return
  }
  if (count > limit) {
    throw new HttpError(429, 'rate_limited', `Slow down: ${limit} ${action}s per hour`, {
      retryAfter: windowStart + WINDOW_SECONDS - now,
    })
  }
}
