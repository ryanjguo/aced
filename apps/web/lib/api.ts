import { createApiClient } from '@aced/api-client'

const secret = process.env.INTERNAL_API_SECRET

export const api = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  // A hung API should show the page's error state, not hang the render.
  timeoutMs: 5000,
  // Server-only (not NEXT_PUBLIC_), so browsers never send it: page renders skip the API's per-IP limit.
  fetch: secret
    ? (url, init) =>
        fetch(url, { ...init, headers: { ...init?.headers, 'x-aced-internal': secret } })
    : undefined,
})

/**
 * Public esports data (series, events, players, teams) changes every few minutes at most, so
 * server fetches of it share a 60s cache. Anything personal stays `no-store`.
 */
export const esportsCache: RequestInit = { next: { revalidate: 60 } }
