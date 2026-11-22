import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { workerFresh } from '../src/routes/health.js'
import { buildTestApp, redisReady } from './build-test-app.js'

describe('app', () => {
  const app = buildTestApp()
  app.post('/test/echo', { schema: { body: z.object({ name: z.string().min(2) }) } }, (req) => ({
    name: req.body.name,
  }))
  app.get('/test/boom', () => {
    throw new Error('secret detail')
  })

  beforeAll(() => redisReady(app))
  afterAll(() => app.close())

  it('reports health when Postgres and Redis are up', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ status: 'ok', checks: { postgres: true, redis: true } })
  })

  it('returns not_found for unknown routes', async () => {
    const res = await app.inject({ method: 'GET', url: '/nope' })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: { code: 'not_found', message: expect.any(String) } })
  })

  it('returns bad_request for invalid input', async () => {
    const res = await app.inject({ method: 'POST', url: '/test/echo', payload: { name: 'x' } })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: { code: 'bad_request', message: expect.any(String) } })
  })

  it('accepts valid input', async () => {
    const res = await app.inject({ method: 'POST', url: '/test/echo', payload: { name: 'tenz' } })
    expect(res.json()).toEqual({ name: 'tenz' })
  })

  it('hides unexpected errors', async () => {
    const res = await app.inject({ method: 'GET', url: '/test/boom' })
    expect(res.statusCode).toBe(500)
    expect(res.json()).toEqual({ error: { code: 'internal', message: 'Internal server error' } })
  })

  it('allows the web origin', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'http://localhost:3000' },
    })
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000')
  })
  it('allows PATCH and DELETE in preflight', async () => {
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/me',
      headers: { origin: 'http://localhost:3000', 'access-control-request-method': 'PATCH' },
    })
    expect(res.headers['access-control-allow-methods']).toContain('PATCH')
    expect(res.headers['access-control-allow-methods']).toContain('DELETE')
  })
  it('reports worker freshness', () => {
    const now = Date.parse('2027-01-01T12:00:00Z')
    expect(workerFresh(null, now)).toBeNull()
    expect(workerFresh('2027-01-01T11:45:00Z', now)).toBe(true)
    expect(workerFresh('2027-01-01T11:00:00Z', now)).toBe(false)
    expect(workerFresh('garbage', now)).toBe(false)
  })
})
