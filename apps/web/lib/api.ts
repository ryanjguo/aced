import { createApiClient } from '@aced/api-client'

export const api = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  // A hung API should show the page's error state, not hang the render.
  timeoutMs: 5000,
})
