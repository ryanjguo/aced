export type Region = 'americas' | 'emea' | 'pacific' | 'china' | 'international'

export type SeriesStatus = 'scheduled' | 'live' | 'completed' | 'cancelled'

export interface Event {
  id: string
  name: string
  slug: string
  region: Region | null
  startsAt: string | null
  endsAt: string | null
}

export interface Team {
  id: string
  name: string
  tag: string
  slug: string
  region: Region | null
  logoUrl: string | null
}

export interface Player {
  id: string
  handle: string
  slug: string
  realName: string | null
  country: string | null
  team: Team | null
}

export interface Series {
  id: string
  event: Pick<Event, 'id' | 'name' | 'slug'>
  teamA: Team | null
  teamB: Team | null
  bestOf: 1 | 3 | 5
  scheduledAt: string
  status: SeriesStatus
  score: [number, number]
  winnerId: string | null
}

export interface PlayerMapStat {
  player: Pick<Player, 'id' | 'handle' | 'slug'>
  teamId: string
  agent: string | null
  kills: number
  deaths: number
  assists: number
  acs: number | null
  adr: number | null
  firstKills: number | null
  firstDeaths: number | null
  headshotPct: number | null
}

export interface SeriesMap {
  id: string
  order: number
  mapName: string
  score: [number, number]
  winnerId: string | null
  stats: PlayerMapStat[]
}

export interface SeriesDetail extends Series {
  maps: SeriesMap[]
}

export interface HealthResponse {
  status: 'ok' | 'degraded'
  service: string
  time: string
  checks: {
    postgres: boolean
    redis: boolean
  }
}

export type ApiErrorCode =
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'handle_taken'
  | 'internal'

export interface ApiError {
  error: {
    code: ApiErrorCode
    message: string
  }
}

export type UserRole = 'user' | 'moderator' | 'admin'

export interface UserSummary {
  id: string
  handle: string
  avatarUrl: string | null
  role: UserRole
}

export interface Board {
  id: string
  slug: string
  name: string
  description: string
}

export type PostKind =
  | 'take'
  | 'thread'
  | 'link'
  | 'clip'
  | 'rumor'
  | 'match_thread'
  | 'result'
  | 'stat_card'
  | 'transfer'

export interface Post {
  id: string
  kind: PostKind
  author: UserSummary | null
  board: Pick<Board, 'id' | 'slug' | 'name'> | null
  title: string | null
  body: string
  url: string | null
  seriesId: string | null
  score: number
  commentCount: number
  isLocked: boolean
  createdAt: string
  editedAt: string | null
}

export interface Comment {
  id: string
  postId: string
  parentId: string | null
  author: UserSummary | null
  body: string
  score: number
  depth: number
  isRemoved: boolean
  createdAt: string
  editedAt: string | null
}

export type VoteValue = -1 | 0 | 1

export interface SeriesList {
  items: Series[]
}

export interface EventDetail {
  event: Event
  series: Series[]
}
