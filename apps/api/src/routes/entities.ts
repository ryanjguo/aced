import { and, asc, desc, eq, gte, inArray, or, schema, sql } from '@aced/db'
import type { PlayerDetail, TeamDetail } from '@aced/types'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { HttpError } from '../errors.js'
import { toTeam } from '../mappers/esports.js'
import { loadSeries } from './series.js'

const { players, teams, series, maps, playerMapStats } = schema

const RECENT = 10
const AVERAGE_DAYS = 30
const params = z.object({ slug: z.string().min(1).max(100) })

export const entityRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/players/:slug', { schema: { params } }, async (req): Promise<PlayerDetail> => {
    const [row] = await app.db
      .select({ player: players, team: teams })
      .from(players)
      .leftJoin(teams, eq(teams.id, players.currentTeamId))
      .where(eq(players.slug, req.params.slug))
    if (!row) throw new HttpError(404, 'not_found', 'Player not found')
    const { player } = row

    const since = new Date(Date.now() - AVERAGE_DAYS * 24 * 60 * 60 * 1000)
    const [recent, [avg]] = await Promise.all([
      app.db
        .select({ stat: playerMapStats, map: maps, series })
        .from(playerMapStats)
        .innerJoin(maps, eq(maps.id, playerMapStats.mapId))
        .innerJoin(series, eq(series.id, maps.seriesId))
        .where(eq(playerMapStats.playerId, player.id))
        .orderBy(desc(maps.completedAt), desc(maps.id))
        .limit(RECENT),
      app.db
        .select({
          maps: sql<number>`count(*)::int`,
          acs: sql<number | null>`avg(${playerMapStats.acs})::float`,
          kd: sql<
            number | null
          >`sum(${playerMapStats.kills})::float / nullif(sum(${playerMapStats.deaths}), 0)`,
          adr: sql<number | null>`avg(${playerMapStats.adr})::float`,
          firstKillsPerMap: sql<number | null>`avg(${playerMapStats.firstKills})::float`,
        })
        .from(playerMapStats)
        .innerJoin(maps, eq(maps.id, playerMapStats.mapId))
        .where(and(eq(playerMapStats.playerId, player.id), gte(maps.completedAt, since))),
    ])

    const opponentIds = recent
      .map((r) => (r.series.teamAId === r.stat.teamId ? r.series.teamBId : r.series.teamAId))
      .filter((id): id is string => id !== null)
    const opponents = opponentIds.length
      ? await app.db.select().from(teams).where(inArray(teams.id, opponentIds))
      : []

    return {
      id: player.id,
      handle: player.handle,
      slug: player.slug,
      realName: player.realName,
      country: player.country,
      team: row.team ? toTeam(row.team) : null,
      averages: avg && avg.maps > 0 ? avg : null,
      recentMaps: recent.map(({ stat, map, series: s }) => {
        const opponentId = s.teamAId === stat.teamId ? s.teamBId : s.teamAId
        const opponent = opponents.find((t) => t.id === opponentId)
        return {
          seriesId: s.id,
          mapName: map.mapName,
          playedAt: map.completedAt?.toISOString() ?? null,
          opponent: opponent ? toTeam(opponent) : null,
          won: map.winnerId ? map.winnerId === stat.teamId : null,
          stat: {
            agent: stat.agent,
            kills: stat.kills,
            deaths: stat.deaths,
            assists: stat.assists,
            acs: stat.acs,
            adr: stat.adr,
            firstKills: stat.firstKills,
            firstDeaths: stat.firstDeaths,
            headshotPct: stat.headshotPct,
          },
        }
      }),
    }
  })

  app.get('/teams/:slug', { schema: { params } }, async (req): Promise<TeamDetail> => {
    const [team] = await app.db.select().from(teams).where(eq(teams.slug, req.params.slug))
    if (!team) throw new HttpError(404, 'not_found', 'Team not found')

    const playsIn = or(eq(series.teamAId, team.id), eq(series.teamBId, team.id))
    const [roster, recent, upcoming] = await Promise.all([
      app.db
        .select()
        .from(players)
        .where(eq(players.currentTeamId, team.id))
        .orderBy(asc(players.handle)),
      app.db
        .select()
        .from(series)
        .where(and(playsIn, eq(series.status, 'completed')))
        .orderBy(desc(series.scheduledAt))
        .limit(RECENT),
      app.db
        .select()
        .from(series)
        .where(and(playsIn, inArray(series.status, ['scheduled', 'live'])))
        .orderBy(asc(series.scheduledAt))
        .limit(RECENT),
    ])

    const [recentSeries, upcomingSeries] = await Promise.all([
      loadSeries(app.db, recent),
      loadSeries(app.db, upcoming),
    ])
    return {
      team: toTeam(team),
      roster: roster.map((p) => ({
        id: p.id,
        handle: p.handle,
        slug: p.slug,
        realName: p.realName,
        country: p.country,
      })),
      recent: recentSeries,
      upcoming: upcomingSeries,
    }
  })
}
