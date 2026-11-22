import { eq, schema } from '@aced/db'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { env } from '../src/env.js'
import { buildTestApp, createUser } from './build-test-app.js'

describe('origin check on writes', () => {
  const app = buildTestApp()
  let user = { id: '', cookie: '' }

  beforeAll(async () => {
    user = await createUser(app, 'orig')
  })
  afterAll(async () => {
    await app.db.delete(schema.posts).where(eq(schema.posts.authorId, user.id))
    await app.db.delete(schema.users).where(eq(schema.users.id, user.id))
    await app.close()
  })

  const post = (origin?: string) =>
    app.inject({
      method: 'POST',
      url: '/posts',
      headers: { cookie: user.cookie, ...(origin && { origin }) },
      payload: { kind: 'take', body: 'origin check' },
    })

  it('rejects writes from another site', async () => {
    const res = await post('https://evil.example')
    expect(res.statusCode).toBe(403)
    expect(res.json()).toMatchObject({ error: { code: 'forbidden' } })
  })

  it('allows writes from the web app and without an Origin', async () => {
    expect((await post(env.webOrigin)).statusCode).toBe(201)
    expect((await post()).statusCode).toBe(201)
  })

  it('allows reads from anywhere', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/boards',
      headers: { origin: 'https://evil.example' },
    })
    expect(res.statusCode).toBe(200)
  })
})
