import type {
  ApiError,
  ApiErrorCode,
  BoardList,
  CommentNode,
  CreatePostInput,
  EntityResult,
  EventDetail,
  HealthResponse,
  Me,
  ModActionInput,
  ModQueueItem,
  Page,
  PlayerDetail,
  Post,
  PostSort,
  Profile,
  ProfileComment,
  SeriesDetail,
  SeriesList,
  SeriesStatus,
  TagEntityType,
  TeamDetail,
  TopWindow,
  UpdateMeInput,
  UpdatePostInput,
  VoteResult,
  VoteValue,
} from '@aced/types'

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly retryAfter?: number,
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

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

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
    if (isApiError(body)) {
      const { code, message, retryAfter } = body.error
      throw new ApiClientError(res.status, code, message, retryAfter)
    }
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
    createPost: (input: CreatePostInput) => request<Post>('/posts', json('POST', input)),
    updatePost: (id: string, input: UpdatePostInput) =>
      request<Post>(`/posts/${encodeURIComponent(id)}`, json('PATCH', input)),
    post: (id: string, init?: RequestInit) =>
      request<Post>(`/posts/${encodeURIComponent(id)}`, init),
    postComments: (id: string, cursor?: string, init?: RequestInit) =>
      request<Page<CommentNode>>(
        `/posts/${encodeURIComponent(id)}/comments${query({ cursor })}`,
        init,
      ),
    player: (slug: string, init?: RequestInit) =>
      request<PlayerDetail>(`/players/${encodeURIComponent(slug)}`, init),
    team: (slug: string, init?: RequestInit) =>
      request<TeamDetail>(`/teams/${encodeURIComponent(slug)}`, init),
    entityPosts: (
      entityType: TagEntityType,
      entityId: string,
      params: BoardPostsQuery = {},
      init?: RequestInit,
    ) => request<Page<Post>>(`/posts${query({ entityType, entityId, ...params })}`, init),
    searchEntities: (q: string, types?: TagEntityType[], init?: RequestInit) =>
      request<{ items: EntityResult[] }>(
        `/search/entities${query({ q, types: types?.join(',') })}`,
        init,
      ),
    user: (handle: string, init?: RequestInit) =>
      request<Profile>(`/users/${encodeURIComponent(handle)}`, init),
    userPosts: (handle: string, cursor?: string, init?: RequestInit) =>
      request<Page<Post>>(`/users/${encodeURIComponent(handle)}/posts${query({ cursor })}`, init),
    userComments: (handle: string, cursor?: string, init?: RequestInit) =>
      request<Page<ProfileComment>>(
        `/users/${encodeURIComponent(handle)}/comments${query({ cursor })}`,
        init,
      ),
    vote: (targetType: 'post' | 'comment', targetId: string, value: VoteValue) =>
      request<VoteResult>('/votes', json('PUT', { targetType, targetId, value })),
    createComment: (postId: string, input: { body: string; parentId?: string }) =>
      request<CommentNode>(`/posts/${encodeURIComponent(postId)}/comments`, json('POST', input)),
    updateComment: (id: string, body: string) =>
      request<CommentNode>(`/comments/${encodeURIComponent(id)}`, json('PATCH', { body })),
    deleteComment: (id: string) =>
      request<null>(`/comments/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    commentReplies: (id: string, init?: RequestInit) =>
      request<{ items: CommentNode[] }>(`/comments/${encodeURIComponent(id)}/replies`, init),
    modReports: (cursor?: string, init?: RequestInit) =>
      request<Page<ModQueueItem>>(`/mod/reports${query({ cursor })}`, init),
    modAction: (input: ModActionInput) =>
      request<{ id: string }>('/mod/actions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      }),
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
