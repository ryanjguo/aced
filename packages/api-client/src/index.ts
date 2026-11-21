import type { ApiError, ApiErrorCode, HealthResponse } from '@aced/types'

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

export interface ApiClientOptions {
  baseUrl: string
  fetch?: typeof fetch
}

function isApiError(body: unknown): body is ApiError {
  return typeof body === 'object' && body !== null && 'error' in body
}

export function createApiClient({ baseUrl, fetch: fetchFn = fetch }: ApiClientOptions) {
  async function request<T>(path: string, init?: RequestInit, okStatuses: number[] = []) {
    const res = await fetchFn(`${baseUrl}${path}`, init)
    const body: unknown = await res.json().catch(() => null)
    if (res.ok || okStatuses.includes(res.status)) return body as T
    if (isApiError(body)) throw new ApiClientError(res.status, body.error.code, body.error.message)
    throw new ApiClientError(res.status, 'internal', `Request failed with status ${res.status}`)
  }

  return {
    // 503 still carries a health report saying what is down.
    health: (init?: RequestInit) => request<HealthResponse>('/health', init, [503]),
  }
}

export type ApiClient = ReturnType<typeof createApiClient>
