import { randomUUID } from 'node:crypto'
import { eq, schema } from '@aced/db'
import type { Page, Post } from '@aced/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildTestApp, signIn } from './build-test-app.js'

const { users, posts, players, events } = schema

describe('rumors', () => {
  const app = buildTestApp()
  const handle = `rum_${randomUUID().slice(0, 8)}`
  let userId = ''
  let cookie = ''
  let playerId = ''
  let eventId = ''

  beforeAll(async () => {
    const [u] = await app.db
      .insert(users)
      .values({ name: handle, email: `${handle}@test.dev`, handle })
      .returning()
    userId = u?.id ?? ''
    cookie = (await signIn(app, userId)).cookie
    playerId = (await app.db.select().from(players).where(eq(players.slug, 'ozzy')))[0]?.id ?? ''
    eventId = (await app.db.select().from(events).limit(1))[0]?.id ?? ''
  })

  afterAll(async () => {
    await app.db.delete(posts).where(eq(posts.authorId, userId))
    await app.db.delete(users).where(eq(users.id, userId))
    await app.close()
  })

  const rumor = (payload: object) =>
    app.inject({
      method: 'POST',
      url: '/posts',
      headers: { cookie },
      payload: {
        kind: 'rumor',
        title: 'Ozzy to Northwind?',
        url: 'https://example.com/r',
        ...payload,
      },
    })

  it('posts a rumor into Transfers & Rumors as unconfirmed', async () => {
    const res = await rumor({ tags: [{ type: 'player', id: playerId }] })
    expect(res.statusCode).toBe(201)
    const post = res.json<Post>()
    expect(post).toMatchObject({ kind: 'rumor', rumorStatus: 'open', board: { slug: 'transfers' } })

    const listed = (
      await app.inject({ method: 'GET', url: '/boards/transfers/posts?sort=new' })
    ).json<Page<Post>>()
    expect(listed.items.find((p) => p.id === post.id)?.rumorStatus).toBe('open')
  })

  it('requires a source link', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/posts',
      headers: { cookie },
      payload: { kind: 'rumor', title: 'No source', tags: [{ type: 'player', id: playerId }] },
    })
    expect(res.statusCode).toBe(400)
  })

  it('requires a player or team tag', async () => {
    expect((await rumor({ tags: [] })).statusCode).toBe(400)
    expect((await rumor({ tags: [{ type: 'event', id: eventId }] })).statusCode).toBe(400)
  })

  it('leaves rumorStatus null on other posts', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/posts',
      headers: { cookie },
      payload: { kind: 'take', body: 'not a rumor' },
    })
    expect(res.json<Post>().rumorStatus).toBeNull()
  })
  it('lists rumors by status, newest first', async () => {
    // Other test files resolve rumors in parallel, so only assert on the one created here.
    const mine = (await rumor({ tags: [{ type: 'player', id: playerId }] })).json<Post>()
    const open = (await app.inject({ method: 'GET', url: '/rumors?status=open' })).json<
      Page<Post>
    >()
    expect(open.items.find((p) => p.id === mine.id)).toMatchObject({
      kind: 'rumor',
      rumorStatus: 'open',
    })
    const times = open.items.map((p) => Date.parse(p.createdAt))
    expect(times).toEqual([...times].sort((x, y) => y - x))
    const confirmed = (await app.inject({ method: 'GET', url: '/rumors?status=confirmed' })).json<
      Page<Post>
    >()
    expect(confirmed.items.some((p) => p.id === mine.id)).toBe(false)
    expect((await app.inject({ method: 'GET', url: '/rumors?status=maybe' })).statusCode).toBe(400)
  })
})
