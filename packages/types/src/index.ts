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
  /** Null while a bracket slot is TBD. */
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
