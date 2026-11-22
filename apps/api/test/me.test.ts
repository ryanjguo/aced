import { randomUUID } from 'node:crypto'
import { inArray, schema } from '@aced/db'
import type { UserRole } from '@aced/types'
import { afterAll, describe, expect, it } from 'vitest'
import { requireRole } from '../src/user.js'
import { buildTestApp, signIn } from './build-test-app.js'

describe('current user', () => {
  const app = buildTestApp()
  app.get('/test/mod', { preHandler: requireRole('moderator') }, async () => ({ ok: true }))
  const run = randomUUID().slice(0, 8)
  const userIds: string[] = []

  const createUser = async (handle: string, role: UserRole = 'user') => {
    const [user] = await app.db
      .insert(schema.users)
      .values({ name: handle, email: `${randomUUID()}@test.dev`, handle, role })
      .returning()
    if (!user) throw new Error('insert failed')
    userIds.push(user.id)
    return { user, ...(await signIn(app, user.id)) }
  }

  afterAll(async () => {
    if (userIds.length) await app.db.delete(schema.users).where(inArray(schema.users.id, userIds))
    await app.close()
  })

  it('returns 401 from /me when signed out', async () => {
    const res = await app.inject({ method: 'GET', url: '/me' })
    expect(res.statusCode).toBe(401)
    expect(res.json()).toEqual({ error: { code: 'unauthorized', message: 'Sign in required' } })
  })

  it('returns the signed-in user from /me', async () => {
    const { user, cookie } = await createUser(`me_${run}`)
    const res = await app.inject({ method: 'GET', url: '/me', headers: { cookie } })
    expect(res.json()).toEqual({
      id: user.id,
      handle: `me_${run}`,
      avatarUrl: null,
      role: 'user',
      bio: null,
      onboardedAt: null,
    })
  })

  it('updates handle and bio', async () => {
    const { cookie } = await createUser(`edit_${run}`)
    const res = await app.inject({
      method: 'PATCH',
      url: '/me',
      headers: { cookie },
      payload: { handle: `New_${run}`, bio: 'Duelist main' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ handle: `new_${run}`, bio: 'Duelist main' })
  })

  it('accepts an empty update', async () => {
    const { cookie } = await createUser(`noop_${run}`)
    const res = await app.inject({ method: 'PATCH', url: '/me', headers: { cookie }, payload: {} })
    expect(res.json()).toMatchObject({ handle: `noop_${run}` })
  })

  it.each([[{ handle: 'ab' }], [{ handle: 'has space' }], [{ bio: 'x'.repeat(281) }]])(
    'rejects invalid input %j',
    async (payload) => {
      const { cookie } = await createUser(`bad${randomUUID().slice(0, 8)}`)
      const res = await app.inject({ method: 'PATCH', url: '/me', headers: { cookie }, payload })
      expect(res.statusCode).toBe(400)
    },
  )

  it('returns 409 when the handle is taken', async () => {
    await createUser(`taken_${run}`)
    const { cookie } = await createUser(`other_${run}`)
    const res = await app.inject({
      method: 'PATCH',
      url: '/me',
      headers: { cookie },
      payload: { handle: `TAKEN_${run}` },
    })
    expect(res.statusCode).toBe(409)
    expect(res.json()).toMatchObject({ error: { code: 'handle_taken' } })
  })

  it.each([
    ['user', 403],
    ['moderator', 200],
    ['admin', 200],
  ] as const)('requireRole(moderator) gives %s a %i', async (role, status) => {
    const { cookie } = await createUser(`${role.slice(0, 3)}_${randomUUID().slice(0, 8)}`, role)
    const res = await app.inject({ method: 'GET', url: '/test/mod', headers: { cookie } })
    expect(res.statusCode).toBe(status)
  })

  it('requireRole returns 401 when signed out', async () => {
    const res = await app.inject({ method: 'GET', url: '/test/mod' })
    expect(res.statusCode).toBe(401)
  })
})
