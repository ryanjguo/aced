import type { EventRow, MapRow, PlayerMapStatRow, PlayerRow, SeriesRow, TeamRow } from '@aced/db'
import type { Event, PlayerMapStat, Series, SeriesMap, Team } from '@aced/types'

const iso = (date: Date | null) => date?.toISOString() ?? null

export function toEvent(row: EventRow): Event {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    region: row.region,
    startsAt: iso(row.startsAt),
    endsAt: iso(row.endsAt),
  }
}

export function toTeam(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    tag: row.tag,
    slug: row.slug,
    region: row.region,
    logoUrl: row.logoUrl,
  }
}

export function toSeries(
  row: SeriesRow,
  events: Map<string, EventRow>,
  teams: Map<string, TeamRow>,
): Series {
  const event = events.get(row.eventId)
  if (!event) throw new Error(`Event ${row.eventId} not loaded`)
  const team = (id: string | null) => {
    const t = id ? teams.get(id) : undefined
    return t ? toTeam(t) : null
  }
  return {
    id: row.id,
    event: { id: event.id, name: event.name, slug: event.slug },
    teamA: team(row.teamAId),
    teamB: team(row.teamBId),
    bestOf: row.bestOf as Series['bestOf'], // enforced by series_best_of_check
    scheduledAt: row.scheduledAt.toISOString(),
    status: row.status,
    score: [row.scoreA, row.scoreB],
    winnerId: row.winnerId,
  }
}

export function toPlayerMapStat(row: PlayerMapStatRow, player: PlayerRow): PlayerMapStat {
  return {
    player: { id: player.id, handle: player.handle, slug: player.slug },
    teamId: row.teamId,
    agent: row.agent,
    kills: row.kills,
    deaths: row.deaths,
    assists: row.assists,
    acs: row.acs,
    adr: row.adr,
    firstKills: row.firstKills,
    firstDeaths: row.firstDeaths,
    headshotPct: row.headshotPct,
  }
}

export function toSeriesMap(row: MapRow, stats: PlayerMapStat[]): SeriesMap {
  return {
    id: row.id,
    order: row.order,
    mapName: row.mapName,
    score: [row.scoreA, row.scoreB],
    winnerId: row.winnerId,
    stats,
  }
}
