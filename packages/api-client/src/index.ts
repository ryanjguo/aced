import type {
  ApiError,
  ApiErrorCode,
  BoardList,
  EventDetail,
  HealthResponse,
  Me,
  Page,
  Post,
  PostSort,
  SeriesDetail,
  SeriesList,
  SeriesStatus,
  TopWindow,
  UpdateMeInput,
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

export interface BoardPostsQuery {
  sort?: PostSort
  t?: TopWindow
  cursor?: string
}

const query = (params: object) => {
  const search = new URLSearchParams(
    Object.entries(params).filter((e): e is [string, string] => e[1] !== undefined),
  )
  return search.size ? `?${search}` : ''
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
    // Send the session cookie on cross-origin browser requests; ignored on the server.
    const res = await fetchFn(`${baseUrl}${path}`, { credentials: 'include', ...init })
    const body: unknown = await res.json().catch(() => null)
    if (res.ok || okStatuses.includes(res.status)) return body as T
    if (isApiError(body)) throw new ApiClientError(res.status, body.error.code, body.error.message)
    throw new ApiClientError(res.status, 'internal', `Request failed with status ${res.status}`)
  }

  return {
    // 503 still carries a health report saying what is down.
    health: (init?: RequestInit) => request<HealthResponse>('/health', init, [503]),
    series: (params: SeriesQuery = {}, init?: RequestInit) =>
      request<SeriesList>(`/series${query(params)}`, init),
    seriesById: (id: string, init?: RequestInit) =>
      request<SeriesDetail>(`/series/${encodeURIComponent(id)}`, init),
    event: (slug: string, init?: RequestInit) =>
      request<EventDetail>(`/events/${encodeURIComponent(slug)}`, init),
    boards: (init?: RequestInit) => request<BoardList>('/boards', init),
    boardPosts: (slug: string, params: BoardPostsQuery = {}, init?: RequestInit) =>
      request<Page<Post>>(`/boards/${encodeURIComponent(slug)}/posts${query(params)}`, init),
    me: (init?: RequestInit) => request<Me>('/me', init),
    updateMe: (input: UpdateMeInput) =>
      request<Me>('/me', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      }),
  }
}

export type ApiClient = ReturnType<typeof createApiClient>
