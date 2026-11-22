import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildTestApp, redisReady } from './build-test-app.js'

// Random client IPs (read from X-Forwarded-For) so reruns don't share Redis counters.
const ip = () => `10.${[0, 0, 0].map(() => Math.floor(Math.random() * 255)).join('.')}`

describe('API hardening', () => {
  const app = buildTestApp({ rateLimits: true, internalApiSecret: 'web-secret' })
  // The limiter skips counting while Redis is down (skipOnError), so start once it's connected.
  beforeAll(() => redisReady(app))
  afterAll(() => app.close())

  const search = (from: string) =>
    app.inject({
      method: 'GET',
      url: '/search/entities?q=nw',
      headers: { 'x-forwarded-for': from },
    })

  it('sends security headers', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-frame-options']).toBeDefined()
  })

  it('limits search per IP and answers 429 in the API error shape', async () => {
    const a = ip()
    for (let i = 0; i < 60; i++) expect((await search(a)).statusCode).toBe(200)
    const limited = await search(a)
    expect(limited.statusCode).toBe(429)
    expect(limited.json()).toMatchObject({ error: { code: 'rate_limited' } })
    expect(limited.json().error.retryAfter).toBeGreaterThan(0)
    // Another client, read from X-Forwarded-For, has its own budget.
    expect((await search(ip())).statusCode).toBe(200)
    // The web server, identified by the shared secret, isn't limited by IP.
    const web = await app.inject({
      method: 'GET',
      url: '/search/entities?q=nw',
      headers: { 'x-forwarded-for': a, 'x-aced-internal': 'web-secret' },
    })
    expect(web.statusCode).toBe(200)
  })

  it('ignores X-Forwarded-For entries added before the trusted proxy', async () => {
    const real = ip()
    for (let i = 0; i < 60; i++) await search(`${ip()}, ${real}`)
    // Spoofed first entries change every time, but the real client is still limited.
    expect((await search(`${ip()}, ${real}`)).statusCode).toBe(429)
  })

  it('leaves per-IP limits off until the web secret is configured', async () => {
    const open = buildTestApp({ rateLimits: true })
    const a = ip()
    for (let i = 0; i < 61; i++) {
      const res = await open.inject({
        method: 'GET',
        url: '/search/entities?q=nw',
        headers: { 'x-forwarded-for': a },
      })
      expect(res.statusCode).toBe(200)
    }
    await open.close()
  })

  it('never limits /health', async () => {
    const a = ip()
    for (let i = 0; i < 305; i++) {
      const res = await app.inject({
        method: 'GET',
        url: '/health',
        headers: { 'x-forwarded-for': a },
      })
      expect(res.statusCode).not.toBe(429)
    }
  })

  it('rejects bodies over 256 KB', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/posts',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip() },
      payload: JSON.stringify({ kind: 'take', body: 'x'.repeat(300 * 1024) }),
    })
    expect(res.statusCode).toBe(413)
  })
})
