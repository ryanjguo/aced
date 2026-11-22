import { randomUUID } from 'node:crypto'
import { inArray, schema } from '@aced/db'
import { afterAll, describe, expect, it } from 'vitest'
import { buildTestApp, signIn } from './build-test-app.js'

describe('auth', () => {
  const app = buildTestApp()
  const run = randomUUID().slice(0, 8)
  const userIds: string[] = []

  const createUser = async (name: string) => {
    const ctx = await app.auth.$context
    const user = await ctx.internalAdapter.createUser(
      { name, email: `${randomUUID()}@test.dev` },
      { method: 'admin' },
    )
    userIds.push(user.id)
    return user as typeof user & { handle: string }
  }

  afterAll(async () => {
    if (userIds.length) await app.db.delete(schema.users).where(inArray(schema.users.id, userIds))
    await app.close()
  })

  it('mounts Better Auth under /auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/ok' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })
  })

  it('creates users with UUIDs and unique handles', async () => {
    const first = await createUser(`Tester ${run}`)
    const second = await createUser(`Tester ${run}`)
    expect(first.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(first.handle).toBe(`tester_${run}`)
    expect(second.handle).toBe(`tester_${run}1`)
  })

  it('resolves a session from its cookie', async () => {
    const user = await createUser(`Session ${run}`)
    const { cookie } = await signIn(app, user.id)
    const res = await app.inject({ method: 'GET', url: '/auth/get-session', headers: { cookie } })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({
      user: { id: user.id, handle: `session_${run}`, role: 'user' },
    })
  })
})
