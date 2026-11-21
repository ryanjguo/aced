import { once } from 'node:events'
import { makeSignature } from 'better-auth/crypto'
import { buildApp } from '../src/app.js'
import { env } from '../src/env.js'

type App = ReturnType<typeof buildApp>

export function buildTestApp() {
  return buildApp({
    ...env,
    auth: { ...env.auth, secret: 'test-secret-that-is-at-least-32-chars' },
    logger: false,
  })
}

export async function redisReady(app: App) {
  if (app.redis.status !== 'ready') await once(app.redis, 'ready')
}

/** Creates a session for the user and returns a signed cookie header, like Better Auth's test-utils. */
export async function signIn(app: App, userId: string) {
  const ctx = await app.auth.$context
  const { token } = await ctx.internalAdapter.createSession(userId)
  const cookie = `${ctx.authCookies.sessionToken.name}=${token}.${await makeSignature(token, ctx.secret)}`
  return { cookie }
}
