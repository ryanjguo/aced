import { randomUUID } from 'node:crypto'
import { eq, inArray, schema } from '@aced/db'
import type { Post, Profile, UserRole } from '@aced/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildTestApp, signIn } from './build-test-app.js'

const { users, posts, players, teams, modActions } = schema

describe('rumor resolution and credit', () => {
  const app = buildTestApp()
  const ids: string[] = []
  const people: Record<'a' | 'b' | 'mod', { handle: string; cookie: string }> = {
    a: { handle: '', cookie: '' },
    b: { handle: '', cookie: '' },
    mod: { handle: '', cookie: '' },
  }
  let player = ''
  let team = ''
  let otherTeam = ''

  const createUser = async (key: keyof typeof people, role: UserRole = 'user') => {
    const handle = `rc_${randomUUID().slice(0, 8)}`
    const [u] = await app.db
      .insert(users)
      .values({ name: handle, email: `${handle}@test.dev`, handle, role })
      .returning()
    ids.push(u?.id ?? '')
    people[key] = { handle, cookie: (await signIn(app, u?.id ?? '')).cookie }
  }

  const rumor = async (who: 'a' | 'b', teamId: string) =>
    (
      await app.inject({
        method: 'POST',
        url: '/posts',
        headers: { cookie: people[who].cookie },
        payload: {
          kind: 'rumor',
          title: 'Move incoming',
          url: 'https://example.com/r',
          tags: [
            { type: 'player', id: player },
            { type: 'team', id: teamId },
          ],
        },
      })
    ).json<Post>()

  const resolve = (postId: string, status: string, cookie = people.mod.cookie) =>
    app.inject({
      method: 'POST',
      url: `/mod/rumors/${postId}`,
      headers: { cookie },
      payload: { status },
    })

  const stats = async (who: 'a' | 'b') =>
    (await app.inject({ method: 'GET', url: `/users/${people[who].handle}` })).json<Profile>()
      .rumors

  beforeAll(async () => {
    await createUser('a')
    await createUser('b')
    await createUser('mod', 'moderator')
    player = (await app.db.select().from(players).where(eq(players.slug, 'tundra')))[0]?.id ?? ''
    team = (await app.db.select().from(teams).where(eq(teams.slug, 'driftwood')))[0]?.id ?? ''
    otherTeam = (await app.db.select().from(teams).where(eq(teams.slug, 'emberfall')))[0]?.id ?? ''
  })

  afterAll(async () => {
    await app.db.delete(posts).where(inArray(posts.authorId, ids))
    await app.db.delete(users).where(inArray(users.id, ids))
    await app.close()
  })

  it('gives full credit to the first call and half to later ones', async () => {
    const first = await rumor('a', team)
    const second = await rumor('b', team)
    const wrong = await rumor('a', otherTeam)

    expect((await resolve(first.id, 'confirmed')).statusCode).toBe(204)
    await resolve(second.id, 'confirmed')
    await resolve(wrong.id, 'denied')

    expect(await stats('a')).toEqual({
      posted: 2,
      confirmed: 1,
      denied: 1,
      accuracy: 0.5,
      credit: 1,
    })
    expect(await stats('b')).toEqual({
      posted: 1,
      confirmed: 1,
      denied: 0,
      accuracy: 1,
      credit: 0.5,
    })

    const post = await app.inject({ method: 'GET', url: `/posts/${first.id}` })
    expect(post.json<Post>().rumorStatus).toBe('confirmed')
    const log = await app.db.select().from(modActions).where(eq(modActions.targetId, first.id))
    expect(log.map((l) => l.action)).toEqual(['confirm_rumor'])
  })

  it('is moderator-only and needs a rumor', async () => {
    const r = await rumor('a', team)
    expect((await resolve(r.id, 'confirmed', people.a.cookie)).statusCode).toBe(403)
    expect((await resolve(randomUUID(), 'confirmed')).statusCode).toBe(404)
    expect((await resolve(r.id, 'maybe')).statusCode).toBe(400)
  })

  it('reports empty stats for users without rumors', async () => {
    const profile = (
      await app.inject({ method: 'GET', url: `/users/${people.mod.handle}` })
    ).json<Profile>()
    expect(profile.rumors).toEqual({
      posted: 0,
      confirmed: 0,
      denied: 0,
      accuracy: null,
      credit: 0,
    })
  })
  it('lists open rumors flagged by a matching transfer', async () => {
    const r = await rumor('b', otherTeam)
    const [transfer] = await app.db
      .insert(posts)
      .values({ kind: 'transfer', title: 't' })
      .returning()
    await app.db
      .update(schema.rumorStatus)
      .set({ matchedTransferId: transfer?.id })
      .where(eq(schema.rumorStatus.postId, r.id))
    const res = await app.inject({
      method: 'GET',
      url: '/mod/rumors/matched',
      headers: { cookie: people.mod.cookie },
    })
    const items = res.json<{ items: { rumor: Post; transferId: string }[] }>().items
    expect(items.find((i) => i.rumor.id === r.id)?.transferId).toBe(transfer?.id)
    await app.db.delete(posts).where(eq(posts.id, transfer?.id ?? ''))
    const forbidden = await app.inject({
      method: 'GET',
      url: '/mod/rumors/matched',
      headers: { cookie: people.a.cookie },
    })
    expect(forbidden.statusCode).toBe(403)
  })
})
