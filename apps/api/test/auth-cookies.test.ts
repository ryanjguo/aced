import { createDb } from '@aced/db'
import { describe, expect, it } from 'vitest'
import { createAuth } from '../src/auth.js'

const base = { secret: 'test-secret-that-is-at-least-32-chars', webOrigin: 'https://aced.gg' }
const sessionCookie = async (options: Parameters<typeof createAuth>[1]) => {
  // No queries run: the context only reads config.
  const ctx = await createAuth(createDb('postgres://unused/db', { max: 1 }), options).$context
  return ctx.authCookies.sessionToken
}

describe('auth cookies', () => {
  it('scopes the session cookie to the parent domain when set, secure on https', async () => {
    const cookie = await sessionCookie({
      ...base,
      baseUrl: 'https://api.aced.gg',
      cookieDomain: '.aced.gg',
    })
    expect(cookie.attributes).toMatchObject({ domain: '.aced.gg', secure: true, sameSite: 'lax' })
  })

  it('keeps a host-only, non-secure cookie locally', async () => {
    const cookie = await sessionCookie({ ...base, baseUrl: 'http://localhost:4000' })
    expect(cookie.attributes.domain).toBeUndefined()
    expect(cookie.attributes.secure).toBe(false)
  })
})
