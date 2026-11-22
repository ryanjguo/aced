import { randomUUID } from 'node:crypto'
import { and, eq, schema } from '@aced/db'
import type { Me, Team } from '@aced/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildTestApp, createUser } from './build-test-app.js'

const { teams, follows, users } = schema

describe('onboarding', () => {
  const app = buildTestApp()
  const run = randomUUID().slice(0, 8)
  let teamId = ''

  beforeAll(async () => {
    const [team] = await app.db
      .insert(teams)
      .values({ gridId: `ob-${run}`, name: `Onboard ${run}`, tag: 'OB', slug: `onboard-${run}` })
      .returning()
    teamId = team?.id ?? ''
  })
  afterAll(async () => {
    await app.db.delete(teams).where(eq(teams.id, teamId))
    await app.close()
  })

  const me = (cookie: string) =>
    app.inject({ method: 'GET', url: '/me', headers: { cookie } }).then((r) => r.json<Me>())
  const finish = (cookie: string, picked: string[]) =>
    app.inject({
      method: 'PUT',
      url: '/me/follows',
      headers: { cookie },
      payload: { teams: picked },
    })

  it('lists every team', async () => {
    const res = await app.inject({ method: 'GET', url: '/teams' })
    expect(res.json<{ items: Team[] }>().items).toContainEqual(
      expect.objectContaining({ id: teamId, tag: 'OB' }),
    )
  })

  it('follows the picked teams, ignores unknown ids and marks onboarding done', async () => {
    const user = await createUser(app, 'newbie')
    expect((await me(user.cookie)).onboardedAt).toBeNull()
    const res = await finish(user.cookie, [teamId, randomUUID()])
    expect(res.statusCode).toBe(204)
    expect((await me(user.cookie)).onboardedAt).toEqual(expect.any(String))
    const rows = await app.db
      .select()
      .from(follows)
      .where(and(eq(follows.userId, user.id), eq(follows.targetType, 'team')))
    expect(rows.map((r) => r.targetId)).toEqual([teamId])
    // Running it again is harmless.
    expect((await finish(user.cookie, [teamId])).statusCode).toBe(204)
    await app.db.delete(users).where(eq(users.id, user.id))
  })

  it('skipping marks onboarding done without follows', async () => {
    const user = await createUser(app, 'skipper')
    expect((await finish(user.cookie, [])).statusCode).toBe(204)
    expect((await me(user.cookie)).onboardedAt).toEqual(expect.any(String))
    expect(await app.db.$count(follows, eq(follows.userId, user.id))).toBe(0)
    await app.db.delete(users).where(eq(users.id, user.id))
  })

  it('needs a signed-in user', async () => {
    const res = await app.inject({ method: 'PUT', url: '/me/follows', payload: { teams: [] } })
    expect(res.statusCode).toBe(401)
  })
})
