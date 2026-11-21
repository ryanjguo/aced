import { describe, expect, it, vi } from 'vitest'
import { ApiClientError, createApiClient } from '../src/index.js'

function mockFetch(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }))
}

describe('api client', () => {
  it('returns the parsed body', async () => {
    const health = {
      status: 'ok',
      service: 'api',
      time: 't',
      checks: { postgres: true, redis: true },
    }
    const fetch = mockFetch(200, health)
    const api = createApiClient({ baseUrl: 'http://api', fetch })
    await expect(api.health()).resolves.toEqual(health)
    expect(fetch).toHaveBeenCalledWith('http://api/health', undefined)
  })

  it('returns a degraded health report', async () => {
    const api = createApiClient({
      baseUrl: 'http://api',
      fetch: mockFetch(503, { status: 'degraded' }),
    })
    await expect(api.health()).resolves.toEqual({ status: 'degraded' })
  })

  it('throws ApiClientError with the API error', async () => {
    const fetch = mockFetch(404, { error: { code: 'not_found', message: 'Nope' } })
    const api = createApiClient({ baseUrl: 'http://api', fetch })
    const err = await api.health().catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiClientError)
    expect(err).toMatchObject({ status: 404, code: 'not_found', message: 'Nope' })
  })

  it('throws ApiClientError for non-JSON failures', async () => {
    const fetch = vi.fn(async () => new Response('Bad Gateway', { status: 502 }))
    const api = createApiClient({ baseUrl: 'http://api', fetch })
    await expect(api.health()).rejects.toMatchObject({ status: 502, code: 'internal' })
  })
})
