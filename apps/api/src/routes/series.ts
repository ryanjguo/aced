import { and, asc, type Db, eq, gte, inArray, lte, type SeriesRow, schema } from '@aced/db'
import type { Series, SeriesDetail, SeriesList } from '@aced/types'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { toPlayerMapStat, toSeries, toSeriesMap } from '../mappers/esports.js'

const DAY = 24 * 60 * 60 * 1000

const byId = <T extends { id: string }>(rows: T[]) => new Map(rows.map((r) => [r.id, r]))

/** Maps series rows to API shapes, loading their events and teams in two queries. */
export async function loadSeries(db: Db, rows: SeriesRow[]): Promise<Series[]> {
  if (rows.length === 0) return []
  const eventIds = [...new Set(rows.map((r) => r.eventId))]
  const teamIds = [...new Set(rows.flatMap((r) => [r.teamAId, r.teamBId]))].filter(
    (id): id is string => id !== null,
  )
  const [events, teams] = await Promise.all([
    db.select().from(schema.events).where(inArray(schema.events.id, eventIds)),
    teamIds.length ? db.select().from(schema.teams).where(inArray(schema.teams.id, teamIds)) : [],
  ])
  const eventMap = byId(events)
  const teamMap = byId(teams)
  return rows.map((r) => toSeries(r, eventMap, teamMap))
}

const listQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  status: z.enum(['scheduled', 'live', 'completed', 'cancelled']).optional(),
  eventId: z.uuid().optional(),
})

export const seriesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/series', { schema: { querystring: listQuery } }, async (req): Promise<SeriesList> => {
    const { from, to, status, eventId } = req.query
    const now = Date.now()
    const s = schema.series
    const rows = await app.db
      .select()
      .from(s)
      .where(
        and(
          gte(s.scheduledAt, from ?? new Date(now - 3 * DAY)),
          lte(s.scheduledAt, to ?? new Date(now + 7 * DAY)),
          status ? eq(s.status, status) : undefined,
          eventId ? eq(s.eventId, eventId) : undefined,
        ),
      )
      .orderBy(asc(s.scheduledAt), asc(s.id))
      .limit(200)
    return { items: await loadSeries(app.db, rows) }
  })

  app.get(
    '/series/:id',
    { schema: { params: z.object({ id: z.uuid() }) } },
    async (req, reply): Promise<SeriesDetail | undefined> => {
      const [row] = await app.db
        .select()
        .from(schema.series)
        .where(eq(schema.series.id, req.params.id))
      if (!row) {
        return reply.code(404).send({ error: { code: 'not_found', message: 'Series not found' } })
      }

      const maps = await app.db
        .select()
        .from(schema.maps)
        .where(eq(schema.maps.seriesId, row.id))
        .orderBy(asc(schema.maps.order))
      const stats = maps.length
        ? await app.db
            .select()
            .from(schema.playerMapStats)
            .innerJoin(schema.players, eq(schema.players.id, schema.playerMapStats.playerId))
            .where(
              inArray(
                schema.playerMapStats.mapId,
                maps.map((m) => m.id),
              ),
            )
        : []
      const [series] = await loadSeries(app.db, [row])
      if (!series) throw new Error('unreachable')

      return {
        ...series,
        maps: maps.map((m) =>
          toSeriesMap(
            m,
            stats
              .filter((s) => s.player_map_stats.mapId === m.id)
              .map((s) => toPlayerMapStat(s.player_map_stats, s.players)),
          ),
        ),
      }
    },
  )
}
