import { describe, expect, it, vi } from 'vitest'
import { ApiClientError, createApiClient } from '../src/index.js'

function mockFetch(status: number, body: unknown) {
  return vi.fn(
    async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status }),
  )
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
    expect(fetch).toHaveBeenCalledWith('http://api/health', { credentials: 'include' })
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
  it('builds series query strings', async () => {
    const fetch = mockFetch(200, { items: [] })
    const api = createApiClient({ baseUrl: 'http://api', fetch })
    await api.series({ status: 'live', eventId: undefined })
    await api.series()
    expect(fetch.mock.calls.map((c) => c[0])).toEqual([
      'http://api/series?status=live',
      'http://api/series',
    ])
  })

  it('sends updates as JSON', async () => {
    const fetch = mockFetch(200, { handle: 'tenz' })
    const api = createApiClient({ baseUrl: 'http://api', fetch })
    await api.updateMe({ handle: 'tenz' })
    expect(fetch).toHaveBeenCalledWith('http://api/me', {
      credentials: 'include',
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: '{"handle":"tenz"}',
    })
  })

  it('aborts requests that take longer than timeoutMs', async () => {
    // A fetch that only settles when its signal aborts, like a hung server.
    const fetch = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_, reject) =>
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason)),
        ),
    )
    const api = createApiClient({ baseUrl: 'http://api', fetch, timeoutMs: 20 })
    await expect(api.health()).rejects.toMatchObject({ name: 'TimeoutError' })
  })
})
