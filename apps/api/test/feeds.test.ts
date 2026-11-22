import { eq, inArray, schema, sql } from '@aced/db'
import type { Page, Post } from '@aced/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildTestApp, createUser, redisReady } from './build-test-app.js'

const { users, posts, teams } = schema

describe('feeds', () => {
  const app = buildTestApp()
  const userIds: string[] = []
  const reader = { id: '', cookie: '' }
  const writer = { id: '', cookie: '' }
  const stranger = { id: '', cookie: '' }
  let teamId = ''

  const newUser = async (into: { id: string; cookie: string }) => {
    Object.assign(into, await createUser(app, 'feed'))
    userIds.push(into.id)
  }

  const post = async (cookie: string, body: string, tags: object[] = []) =>
    (
      await app.inject({
        method: 'POST',
        url: '/posts',
        headers: { cookie },
        payload: { kind: 'take', body, tags },
      })
    ).json<Post>()

  const feed = async (kind: string, cookie?: string) =>
    (
      await app.inject({ method: 'GET', url: `/feed/${kind}`, headers: cookie ? { cookie } : {} })
    ).json<Page<Post>>()

  beforeAll(async () => {
    await redisReady(app)
    await app.redis.del('feed:for-you:first-page')
    await newUser(reader)
    await newUser(writer)
    await newUser(stranger)
    teamId = (await app.db.select().from(teams).where(eq(teams.slug, 'driftwood')))[0]?.id ?? ''
  })

  afterAll(async () => {
    await app.db.delete(posts).where(inArray(posts.authorId, userIds))
    await app.db.delete(users).where(inArray(users.id, userIds))
    await app.redis.del('feed:for-you:first-page')
    await app.close()
  })

  it('Following shows posts tagged with followed entities or by followed users, newest first', async () => {
    const tagged = await post(stranger.cookie, 'driftwood take', [{ type: 'team', id: teamId }])
    const byWriter = await post(writer.cookie, 'writer take')
    const unrelated = await post(stranger.cookie, 'unrelated take')

    expect((await feed('following', reader.cookie)).items).toEqual([])
    await app.inject({
      method: 'PUT',
      url: `/follows/team/${teamId}`,
      headers: { cookie: reader.cookie },
    })
    await app.inject({
      method: 'PUT',
      url: `/follows/user/${writer.id}`,
      headers: { cookie: reader.cookie },
    })

    const ids = (await feed('following', reader.cookie)).items.map((p) => p.id)
    expect(ids).toContain(tagged.id)
    expect(ids).toContain(byWriter.id)
    expect(ids).not.toContain(unrelated.id)
    expect(ids.indexOf(byWriter.id)).toBeLessThan(ids.indexOf(tagged.id))
  })

  it('Following needs sign-in', async () => {
    expect((await app.inject({ method: 'GET', url: '/feed/following' })).statusCode).toBe(401)
  })

  it('For You shows recent posts by hot score, cached, with per-viewer votes', async () => {
    await app.redis.del('feed:for-you:first-page')
    const fresh = await post(writer.cookie, 'fresh take')
    const old = await post(writer.cookie, 'old take')
    await app.db
      .update(posts)
      .set({ createdAt: sql`now() - interval '3 days'` })
      .where(eq(posts.id, old.id))
    await app.inject({
      method: 'PUT',
      url: '/votes',
      headers: { cookie: reader.cookie },
      payload: { targetType: 'post', targetId: fresh.id, value: 1 },
    })

    const anon = await feed('for-you')
    expect(anon.items.map((p) => p.id)).toContain(fresh.id)
    expect(anon.items.map((p) => p.id)).not.toContain(old.id)
    const hot = anon.items.map((p) => p.id)

    const later = await post(writer.cookie, 'posted after caching')
    const cached = await feed('for-you', reader.cookie)
    expect(cached.items.map((p) => p.id)).toEqual(hot)
    expect(cached.items.map((p) => p.id)).not.toContain(later.id)
    expect(cached.items.find((p) => p.id === fresh.id)?.myVote).toBe(1)
    expect((await feed('for-you')).items.find((p) => p.id === fresh.id)?.myVote).toBe(0)
  })
})
