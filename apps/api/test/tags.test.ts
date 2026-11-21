import { randomUUID } from 'node:crypto'
import { eq, schema } from '@aced/db'
import type { Page, Post } from '@aced/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildTestApp, signIn } from './build-test-app.js'

const { users, posts, players, teams, events, boards } = schema

// Tags point at `pnpm db:seed` players, teams and events.
describe('post tags', () => {
  const app = buildTestApp()
  const handle = `tag_${randomUUID().slice(0, 8)}`
  let userId = ''
  let cookie = ''
  let boardId = ''
  const ref = { player: '', team: '', event: '' }

  beforeAll(async () => {
    const [user] = await app.db
      .insert(users)
      .values({ name: handle, email: `${handle}@test.dev`, handle })
      .returning()
    userId = user?.id ?? ''
    cookie = (await signIn(app, userId)).cookie
    const one = async <T extends { id: string }>(rows: Promise<T[]>) => (await rows)[0]?.id ?? ''
    ref.player = await one(app.db.select().from(players).where(eq(players.slug, 'kestrel')))
    ref.team = await one(app.db.select().from(teams).where(eq(teams.slug, 'northwind')))
    ref.event = await one(
      app.db.select().from(events).where(eq(events.slug, 'stage-1-2027-americas')),
    )
    boardId = await one(app.db.select().from(boards).where(eq(boards.slug, 'general')))
  })

  afterAll(async () => {
    await app.db.delete(posts).where(eq(posts.authorId, userId))
    await app.db.delete(users).where(eq(users.id, userId))
    await app.close()
  })

  const create = (payload: object) =>
    app.inject({ method: 'POST', url: '/posts', headers: { cookie }, payload })

  it('saves tags and returns them with names on every read', async () => {
    const res = await create({
      kind: 'thread',
      boardId,
      title: 'Kestrel to Northwind?',
      tags: [
        { type: 'player', id: ref.player },
        { type: 'team', id: ref.team },
        { type: 'team', id: ref.team },
      ],
    })
    expect(res.statusCode).toBe(201)
    const post = res.json<Post>()
    expect(post.tags).toHaveLength(2)
    expect(post.tags).toEqual(
      expect.arrayContaining([
        { type: 'player', id: ref.player, name: 'Kestrel', slug: 'kestrel' },
        { type: 'team', id: ref.team, name: 'Northwind', slug: 'northwind' },
      ]),
    )

    const listed = (
      await app.inject({ method: 'GET', url: '/boards/general/posts?sort=new' })
    ).json<Page<Post>>()
    expect(listed.items.find((p) => p.id === post.id)?.tags).toHaveLength(2)
  })

  it('replaces tags on edit and keeps them when omitted', async () => {
    const post = (
      await create({ kind: 'take', body: 'tagged take', tags: [{ type: 'team', id: ref.team }] })
    ).json<Post>()
    const edit = (payload: object) =>
      app.inject({ method: 'PATCH', url: `/posts/${post.id}`, headers: { cookie }, payload })

    const kept = (await edit({ body: 'edited take' })).json<Post>()
    expect(kept.tags.map((t) => t.type)).toEqual(['team'])
    const replaced = (await edit({ tags: [{ type: 'event', id: ref.event }] })).json<Post>()
    expect(replaced.tags.map((t) => t.slug)).toEqual(['stage-1-2027-americas'])
    expect(replaced.editedAt).toBe(kept.editedAt)
  })

  it('rejects unknown entities and more than 10 tags', async () => {
    const unknown = await create({
      kind: 'take',
      body: 'x',
      tags: [{ type: 'player', id: randomUUID() }],
    })
    expect(unknown.statusCode).toBe(400)
    const tooMany = await create({
      kind: 'take',
      body: 'x',
      tags: Array.from({ length: 11 }, () => ({ type: 'team', id: ref.team })),
    })
    expect(tooMany.statusCode).toBe(400)
    const after = await app.db.select().from(posts).where(eq(posts.authorId, userId))
    expect(after.some((p) => p.body === 'x')).toBe(false)
  })
})
