export type SeriesStatus = 'scheduled' | 'live' | 'completed'

export interface Team {
  id: string
  name: string
  tag: string
  logoUrl?: string
}

export interface Series {
  id: string
  tournamentId: string
  teamA: Team
  teamB: Team
  bestOf: 1 | 3 | 5
  scheduledAt: string
  status: SeriesStatus
  score: [number, number]
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
