import type {
  ApiError,
  ApiErrorCode,
  EventDetail,
  HealthResponse,
  SeriesDetail,
  SeriesList,
  SeriesStatus,
} from '@aced/types'

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

export interface SeriesQuery {
  from?: string
  to?: string
  status?: SeriesStatus
  eventId?: string
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
    series: (query: SeriesQuery = {}, init?: RequestInit) => {
      const params = new URLSearchParams(
        Object.entries(query).filter((e): e is [string, string] => e[1] !== undefined),
      )
      return request<SeriesList>(`/series${params.size ? `?${params}` : ''}`, init)
    },
    seriesById: (id: string, init?: RequestInit) =>
      request<SeriesDetail>(`/series/${encodeURIComponent(id)}`, init),
    event: (slug: string, init?: RequestInit) =>
      request<EventDetail>(`/events/${encodeURIComponent(slug)}`, init),
  }
}

export type ApiClient = ReturnType<typeof createApiClient>
