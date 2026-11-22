import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { schema } from '@aced/db'
import type { Post } from '@aced/types'
import { makeSignature } from 'better-auth/crypto'
import { buildApp } from '../src/app.js'
import { env } from '../src/env.js'

type App = ReturnType<typeof buildApp>

export function buildTestApp(
  options: { rateLimits?: boolean; testLogin?: boolean; internalApiSecret?: string } = {},
) {
  return buildApp({
    ...env,
    auth: { ...env.auth, secret: 'test-secret-that-is-at-least-32-chars' },
    logger: false,
    rateLimits: options.rateLimits ?? false,
    testLogin: options.testLogin ?? env.testLogin,
    internalApiSecret: options.internalApiSecret,
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

/** Inserts a signed-in user with handle `<prefix>_<random>`; `values` overrides columns (role, createdAt, …). */
export async function createUser(
  app: App,
  prefix: string,
  values: Partial<typeof schema.users.$inferInsert> = {},
) {
  const run = randomUUID().slice(0, 8)
  const [user] = await app.db
    .insert(schema.users)
    .values({ name: run, email: `${run}@test.dev`, handle: `${prefix}_${run}`, ...values })
    .returning()
  if (!user) throw new Error('insert failed')
  return { id: user.id, handle: user.handle, ...(await signIn(app, user.id)) }
}

/** Posts a take as the cookie's user and returns it. */
export async function createPost(app: App, cookie: string | undefined, body = 'Test post') {
  const res = await app.inject({
    method: 'POST',
    url: '/posts',
    headers: { cookie },
    payload: { kind: 'take', body },
  })
  return res.json<Post>()
}
