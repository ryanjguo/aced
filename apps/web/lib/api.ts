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
