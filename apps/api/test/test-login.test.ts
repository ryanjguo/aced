import { inArray, schema } from '@aced/db'
import { afterAll, describe, expect, it } from 'vitest'
import { buildTestApp, createUser } from './build-test-app.js'

describe('test login', () => {
  const app = buildTestApp({ testLogin: true })
  const off = buildTestApp({ testLogin: false })
  const userIds: string[] = []

  afterAll(async () => {
    await app.db.delete(schema.users).where(inArray(schema.users.id, userIds))
    await Promise.all([app.close(), off.close()])
  })

  it('signs in as a user by handle', async () => {
    const user = await createUser(app, 'tl')
    userIds.push(user.id)
    const res = await app.inject({
      method: 'POST',
      url: '/auth/test-login',
      payload: { handle: user.handle },
    })
    expect(res.statusCode).toBe(204)
    const cookie = String(res.headers['set-cookie']).split(';')[0]
    const me = await app.inject({ method: 'GET', url: '/me', headers: { cookie } })
    expect(me.json()).toMatchObject({ handle: user.handle })
  })

  it('404s for an unknown handle', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/test-login',
      payload: { handle: 'nobody_here' },
    })
    expect(res.statusCode).toBe(404)
  })

  it('does not exist unless enabled', async () => {
    const res = await off.inject({
      method: 'POST',
      url: '/auth/test-login',
      payload: { handle: 'anyone' },
    })
    expect(res.statusCode).not.toBe(204)
    expect(res.headers['set-cookie']).toBeUndefined()
  })
})
