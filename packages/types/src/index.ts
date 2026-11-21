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
  | 'locked'
  | 'content_blocked'
  | 'rate_limited'
  | 'already_reported'
  | 'banned'
  | 'internal'

export interface ApiError {
  error: {
    code: ApiErrorCode
    message: string
    /** Seconds until a rate-limited request may be retried. */
    retryAfter?: number
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
  isRemoved: boolean
  /** The viewer's vote; 0 when signed out. */
  myVote: VoteValue
  createdAt: string
  editedAt: string | null
  tags: PostTag[]
  /** Set for `rumor` posts. */
  rumorStatus: RumorStatus | null
  /** Structured data for generated cards; null for user posts. */
  data: PostData | null
}

export interface Comment {
  id: string
  postId: string
  parentId: string | null
  author: UserSummary | null
  body: string
  score: number
  depth: number
  replyCount: number
  isRemoved: boolean
  /** The viewer's vote; 0 when signed out. */
  myVote: VoteValue
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

export interface Page<T> {
  items: T[]
  nextCursor: string | null
}

export interface BoardList {
  items: Board[]
}

export type PostSort = 'hot' | 'new' | 'top'
export type TopWindow = 'day' | 'week' | 'all'

export interface TagRef {
  type: TagEntityType
  id: string
}

export type RumorStatus = 'open' | 'confirmed' | 'denied'

export type CreatePostInput = (
  | { kind: 'thread'; boardId: string; title: string; body?: string }
  | { kind: 'link'; boardId: string; title: string; url: string; body?: string }
  | { kind: 'take'; body: string; boardId?: string }
  | { kind: 'rumor'; title: string; url: string; body?: string }
) & { tags?: TagRef[] }

export interface UpdatePostInput {
  title?: string
  body?: string
  /** Replaces all tags when present. */
  tags?: TagRef[]
}

export interface CommentNode extends Comment {
  replies: CommentNode[]
}

export interface VoteResult {
  score: number
  myVote: VoteValue
}

export type ReportReason = 'spam' | 'harassment' | 'misinformation' | 'rumor_no_source' | 'other'

export interface CreateReportInput {
  targetType: 'post' | 'comment' | 'user'
  targetId: string
  reason: ReportReason
  note?: string
}

export type ModActionType =
  | 'remove'
  | 'restore'
  | 'lock'
  | 'unlock'
  | 'ban'
  | 'unban'
  | 'dismiss'
  | 'confirm_rumor'
  | 'deny_rumor'

export interface ModQueueItem {
  targetType: 'post' | 'comment' | 'user'
  targetId: string
  reportCount: number
  reasons: ReportReason[]
  notes: string[]
  lastReportedAt: string
  /** What was reported, shown in full to moderators even if removed. Null if it no longer exists. */
  preview: {
    title: string | null
    body: string
    author: UserSummary | null
    postId: string | null
    isRemoved: boolean
    isLocked: boolean
  } | null
}

export interface ModActionInput {
  action: ModActionType
  targetType: 'post' | 'comment' | 'user'
  targetId: string
  reason?: string
  /** Required for `ban`. */
  until?: string
}

export interface UpdateMeInput {
  handle?: string
  bio?: string | null
}

export interface Me extends UserSummary {
  bio: string | null
}

export interface RumorStats {
  posted: number
  confirmed: number
  denied: number
  /** Confirmed share of resolved rumors; null until one is resolved. */
  accuracy: number | null
  /** 1 per confirmed rumor that called a move first, 0.5 per later one. */
  credit: number
}

export interface Profile extends UserSummary {
  bio: string | null
  karma: number
  createdAt: string
  rumors: RumorStats
}

export interface ProfileComment extends Comment {
  post: { id: string; title: string | null }
}

export type TagEntityType = 'player' | 'team' | 'event'

export interface PostTag {
  type: TagEntityType
  id: string
  /** Display name: player handle, team name or event name. */
  name: string
  slug: string
}

export interface EntityResult {
  type: TagEntityType
  id: string
  /** Player handle, team name or event name. */
  name: string
  slug: string
  /** Player's current team tag, team tag or event region. */
  detail: string | null
}

export interface PlayerAverages {
  /** Maps played in the window. */
  maps: number
  acs: number | null
  kd: number | null
  adr: number | null
  firstKillsPerMap: number | null
}

export interface PlayerRecentMap {
  seriesId: string
  mapName: string
  playedAt: string | null
  opponent: Team | null
  won: boolean | null
  stat: Omit<PlayerMapStat, 'player' | 'teamId'>
}

export interface PlayerDetail extends Player {
  /** Last 30 days; null when no maps were played. */
  averages: PlayerAverages | null
  recentMaps: PlayerRecentMap[]
}

export interface TeamDetail {
  team: Team
  roster: Pick<Player, 'id' | 'handle' | 'slug' | 'realName' | 'country'>[]
  recent: Series[]
  upcoming: Series[]
}

export type FollowTargetType = 'player' | 'team' | 'event' | 'user'

export interface Follow {
  type: FollowTargetType
  id: string
  /** Player handle, team or event name, or user handle. */
  name: string
  slug: string
}

export interface ResultCardData {
  type: 'result'
  seriesId: string
  event: { name: string; slug: string }
  teamA: { name: string; tag: string; slug: string }
  teamB: { name: string; tag: string; slug: string }
  score: [number, number]
  winner: 'a' | 'b' | null
  maps: { name: string; score: [number, number] }[]
}

export interface StatCardData {
  type: 'stat_card'
  seriesId: string
  mapName: string
  event: { name: string; slug: string }
  player: { handle: string; slug: string }
  team: { name: string; tag: string; slug: string }
  opponent: { name: string; tag: string; slug: string } | null
  won: boolean | null
  line: {
    agent: string | null
    kills: number
    deaths: number
    assists: number
    acs: number | null
    adr: number | null
    firstKills: number | null
  }
  /** Why the performance stood out, e.g. "30+ kills". */
  highlight: string
}

export interface TransferCardData {
  type: 'transfer'
  player: { handle: string; slug: string }
  from: { name: string; tag: string; slug: string } | null
  to: { name: string; tag: string; slug: string } | null
}

export type PostData = ResultCardData | StatCardData | TransferCardData
