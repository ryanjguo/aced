import { createApiClient } from '@aced/api-client'
import { cookies } from 'next/headers'

/**
 * API client for server components that forwards the viewer's cookies, so responses include
 * per-user fields like `myVote`. Needs the session cookie on a domain shared with the API.
 */
// Lets the API tell page renders apart from browsers for per-IP rate limits.
const internal: Record<string, string> = process.env.INTERNAL_API_SECRET
  ? { 'x-aced-internal': process.env.INTERNAL_API_SECRET }
  : {}

export async function serverApi() {
  const cookie = (await cookies()).toString()
  return createApiClient({
    baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
    timeoutMs: 5000,
    fetch: (url, init) =>
      fetch(url, { ...init, headers: { ...init?.headers, cookie, ...internal } }),
  })
}
