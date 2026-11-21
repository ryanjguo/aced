import { randomUUID } from 'node:crypto'
import { eq, schema } from '@aced/db'
import type { Page, Post, Profile, ProfileComment } from '@aced/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildTestApp, signIn } from './build-test-app.js'

const { users, posts } = schema

describe('user profiles', () => {
  const app = buildTestApp()
  const handle = `prof_${randomUUID().slice(0, 8)}`
  let userId = ''

  beforeAll(async () => {
    const [user] = await app.db
      .insert(users)
      .values({
        name: handle,
        email: `${handle}@test.dev`,
        handle,
        bio: 'Sentinels fan',
        karma: 12,
      })
      .returning()
    userId = user?.id ?? ''
    const { cookie } = await signIn(app, userId)
    for (let i = 0; i < 27; i++) {
      await app.inject({
        method: 'POST',
        url: '/posts',
        headers: { cookie },
        payload: { kind: 'take', body: `take ${i}` },
      })
    }
    const first = (await app.db.select().from(posts).where(eq(posts.authorId, userId)))[0]
    await app.inject({
      method: 'POST',
      url: `/posts/${first?.id}/comments`,
      headers: { cookie },
      payload: { body: 'my comment' },
    })
    await app.db.update(posts).set({ isRemoved: true }).where(eq(posts.body, 'take 26'))
  })

  afterAll(async () => {
    await app.db.delete(posts).where(eq(posts.authorId, userId))
    await app.db.delete(users).where(eq(users.id, userId))
    await app.close()
  })

  it('returns a profile', async () => {
    const res = await app.inject({ method: 'GET', url: `/users/${handle.toUpperCase()}` })
    expect(res.json<Profile>()).toMatchObject({
      handle,
      bio: 'Sentinels fan',
      karma: 12,
      createdAt: expect.any(String),
    })
  })

  it('pages posts newest first, without removed ones', async () => {
    const first = (await app.inject({ method: 'GET', url: `/users/${handle}/posts` })).json<
      Page<Post>
    >()
    expect(first.items).toHaveLength(25)
    expect(first.items[0]?.body).toBe('take 25')
    const second = (
      await app.inject({ method: 'GET', url: `/users/${handle}/posts?cursor=${first.nextCursor}` })
    ).json<Page<Post>>()
    expect(second.items.map((p) => p.body)).toEqual(['take 0'])
    expect(second.nextCursor).toBeNull()
  })

  it('lists comments with their post', async () => {
    const res = await app.inject({ method: 'GET', url: `/users/${handle}/comments` })
    const { items } = res.json<Page<ProfileComment>>()
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ body: 'my comment', post: { id: expect.any(String) } })
  })

  it('404s unknown users', async () => {
    expect((await app.inject({ method: 'GET', url: '/users/nobody_here_x' })).statusCode).toBe(404)
    expect(
      (await app.inject({ method: 'GET', url: '/users/nobody_here_x/posts' })).statusCode,
    ).toBe(404)
  })
})
