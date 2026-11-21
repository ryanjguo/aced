import { randomUUID } from 'node:crypto'
import { inArray, schema, sql } from '@aced/db'
import type { Post } from '@aced/types'
import { afterAll, describe, expect, it } from 'vitest'
import { buildTestApp, signIn } from './build-test-app.js'

const { users, posts } = schema

describe('content filter and rate limits', () => {
  const app = buildTestApp({ rateLimits: true })
  const userIds: string[] = []

  const createUser = async (ageDays: number) => {
    const run = randomUUID().slice(0, 8)
    const [user] = await app.db
      .insert(users)
      .values({
        name: run,
        email: `${run}@test.dev`,
        handle: `m_${run}`,
        createdAt: sql`now() - make_interval(days => ${ageDays})`,
      })
      .returning()
    if (!user) throw new Error('insert failed')
    userIds.push(user.id)
    return (await signIn(app, user.id)).cookie
  }

  const take = (cookie: string, body = 'fine take') =>
    app.inject({
      method: 'POST',
      url: '/posts',
      headers: { cookie },
      payload: { kind: 'take', body },
    })

  afterAll(async () => {
    await app.db.delete(posts).where(inArray(posts.authorId, userIds))
    await app.db.delete(users).where(inArray(users.id, userIds))
    await app.close()
  })

  it('blocks slurs in posts, comments and handles', async () => {
    const cookie = await createUser(30)
    const blocked = await take(cookie, 'what a r3tard')
    expect(blocked.statusCode).toBe(422)
    expect(blocked.json()).toMatchObject({ error: { code: 'content_blocked' } })

    const post = (await take(cookie)).json<Post>()
    const comment = await app.inject({
      method: 'POST',
      url: `/posts/${post.id}/comments`,
      headers: { cookie },
      payload: { body: 'ok F4GG0T' },
    })
    expect(comment.statusCode).toBe(422)

    const handle = await app.inject({
      method: 'PATCH',
      url: '/me',
      headers: { cookie },
      payload: { bio: 'tranny' },
    })
    expect(handle.statusCode).toBe(422)
  })

  it('limits posts to 5 an hour', async () => {
    const cookie = await createUser(30)
    for (let i = 0; i < 5; i++) expect((await take(cookie)).statusCode).toBe(201)
    const res = await take(cookie)
    expect(res.statusCode).toBe(429)
    const { error } = res.json()
    expect(error.code).toBe('rate_limited')
    expect(error.retryAfter).toBeGreaterThan(0)
    expect(error.retryAfter).toBeLessThanOrEqual(3600)
    expect(Number(res.headers['retry-after'])).toBe(error.retryAfter)
  })

  it('halves limits for accounts under 7 days old', async () => {
    const cookie = await createUser(1)
    for (let i = 0; i < 2; i++) expect((await take(cookie)).statusCode).toBe(201)
    expect((await take(cookie)).statusCode).toBe(429)
  })
})
