import { randomUUID } from 'node:crypto'
import { eq, inArray, schema } from '@aced/db'
import type { Follow } from '@aced/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildTestApp, signIn } from './build-test-app.js'

const { users, teams, players } = schema

describe('follows', () => {
  const app = buildTestApp()
  const ids: string[] = []
  let me = { id: '', cookie: '' }
  let other = { id: '', handle: '' }
  let teamId = ''
  let playerId = ''

  beforeAll(async () => {
    for (let i = 0; i < 2; i++) {
      const handle = `f_${randomUUID().slice(0, 8)}`
      const [u] = await app.db
        .insert(users)
        .values({ name: handle, email: `${handle}@test.dev`, handle })
        .returning()
      ids.push(u?.id ?? '')
      if (i === 0) me = { id: u?.id ?? '', cookie: (await signIn(app, u?.id ?? '')).cookie }
      else other = { id: u?.id ?? '', handle }
    }
    teamId = (await app.db.select().from(teams).where(eq(teams.slug, 'northwind')))[0]?.id ?? ''
    playerId = (await app.db.select().from(players).where(eq(players.slug, 'kestrel')))[0]?.id ?? ''
  })

  afterAll(async () => {
    await app.db.delete(users).where(inArray(users.id, ids))
    await app.close()
  })

  const call = (method: 'PUT' | 'DELETE', type: string, id: string, cookie = me.cookie) =>
    app.inject({ method, url: `/follows/${type}/${id}`, headers: { cookie } })
  const list = async () =>
    (await app.inject({ method: 'GET', url: '/me/follows', headers: { cookie: me.cookie } })).json<{
      items: Follow[]
    }>().items

  it('follows and lists targets with names, idempotently', async () => {
    expect((await call('PUT', 'team', teamId)).statusCode).toBe(204)
    expect((await call('PUT', 'team', teamId)).statusCode).toBe(204)
    await call('PUT', 'player', playerId)
    await call('PUT', 'user', other.id)
    const items = await list()
    expect(items).toHaveLength(3)
    expect(items).toEqual(
      expect.arrayContaining([
        { type: 'team', id: teamId, name: 'Northwind', slug: 'northwind' },
        { type: 'player', id: playerId, name: 'Kestrel', slug: 'kestrel' },
        { type: 'user', id: other.id, name: other.handle, slug: other.handle },
      ]),
    )
  })

  it('unfollows', async () => {
    expect((await call('DELETE', 'team', teamId)).statusCode).toBe(204)
    expect((await list()).some((f) => f.type === 'team')).toBe(false)
  })

  it('validates targets and auth', async () => {
    expect((await call('PUT', 'user', me.id)).statusCode).toBe(400)
    expect((await call('PUT', 'team', randomUUID())).statusCode).toBe(404)
    expect((await call('PUT', 'coach', teamId)).statusCode).toBe(400)
    expect((await call('PUT', 'team', teamId, '')).statusCode).toBe(401)
  })

  it('says whether you follow one target', async () => {
    const check = (cookie?: string) =>
      app.inject({
        method: 'GET',
        url: `/follows/user/${other.id}`,
        headers: cookie ? { cookie } : {},
      })
    await call('DELETE', 'user', other.id)
    expect((await check(me.cookie)).json()).toEqual({ following: false })
    await call('PUT', 'user', other.id)
    expect((await check(me.cookie)).json()).toEqual({ following: true })
    expect((await check()).statusCode).toBe(401)
  })
})
