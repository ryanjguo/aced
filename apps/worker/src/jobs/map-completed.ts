import { type Db, eq, inArray, schema, sql } from '@aced/db'
import { JOBS, type JobDefinition } from '@aced/jobs'
import { hotScore } from '@aced/ranking'
import type { StatCardData } from '@aced/types'

const { maps, series, teams, events, players, playerMapStats, posts, postTags } = schema

export const MAP_COMPLETED = JOBS.mapCompleted

/** What makes a performance card-worthy; checked in order, first match is the highlight. */
export const STAT_CARD_RULES = {
  maxPerMap: 3,
  thresholds: [
    { label: '30+ kills', test: (s: { kills: number }) => s.kills >= 30 },
    { label: '350+ ACS', test: (s: { acs: number | null }) => (s.acs ?? 0) >= 350 },
    {
      label: '6+ first kills',
      test: (s: { firstKills: number | null }) => (s.firstKills ?? 0) >= 6,
    },
  ],
}

/** Creates stat cards for standout players on a completed map, keyed per map and player. */
export async function createStatCards(db: Db, mapId: string) {
  const [map] = await db.select().from(maps).where(eq(maps.id, mapId))
  if (!map?.completedAt) return { skipped: true }
  const [s] = await db.select().from(series).where(eq(series.id, map.seriesId))
  if (!s) return { skipped: true }

  const stats = await db
    .select({ stat: playerMapStats, player: players })
    .from(playerMapStats)
    .innerJoin(players, eq(players.id, playerMapStats.playerId))
    .where(eq(playerMapStats.mapId, map.id))
  const standouts = stats
    .map((r) => ({ ...r, rule: STAT_CARD_RULES.thresholds.find((t) => t.test(r.stat)) }))
    .filter((r) => r.rule)
    .sort((a, b) => (b.stat.acs ?? 0) - (a.stat.acs ?? 0))
    .slice(0, STAT_CARD_RULES.maxPerMap)
  if (standouts.length === 0) return { cards: 0 }

  const teamIds = [s.teamAId, s.teamBId].filter((id): id is string => id !== null)
  const [teamRows, [event]] = await Promise.all([
    db.select().from(teams).where(inArray(teams.id, teamIds)),
    db.select().from(events).where(eq(events.id, s.eventId)),
  ])
  if (!event) return { skipped: true }
  const card = (t: (typeof teamRows)[number] | undefined) =>
    t ? { name: t.name, tag: t.tag, slug: t.slug } : null
  const createdAt = new Date()

  const values = standouts.flatMap(({ stat, player, rule }) => {
    const team = card(teamRows.find((t) => t.id === stat.teamId))
    if (!team || !rule) return []
    const opponent = card(teamRows.find((t) => t.id !== stat.teamId))
    const data: StatCardData = {
      type: 'stat_card',
      seriesId: s.id,
      mapName: map.mapName,
      event: { name: event.name, slug: event.slug },
      player: { handle: player.handle, slug: player.slug },
      team,
      opponent,
      won: map.winnerId ? map.winnerId === stat.teamId : null,
      line: {
        agent: stat.agent,
        kills: stat.kills,
        deaths: stat.deaths,
        assists: stat.assists,
        acs: stat.acs,
        adr: stat.adr,
        firstKills: stat.firstKills,
      },
      highlight: rule.label,
    }
    return [
      {
        kind: 'stat_card' as const,
        sourceKey: `stat_card:${map.id}:${player.id}`,
        title: `${player.handle} went ${stat.kills}/${stat.deaths} on ${map.mapName}${opponent ? ` vs ${opponent.tag}` : ''}`,
        body: '',
        seriesId: s.id,
        data,
        createdAt,
        hotScore: hotScore(0, createdAt),
        tagIds: { player: player.id, team: stat.teamId, event: event.id },
      },
    ]
  })

  return db.transaction(async (tx) => {
    const created = await tx
      .insert(posts)
      .values(values.map(({ tagIds: _, ...v }) => v))
      .onConflictDoUpdate({
        target: posts.sourceKey,
        set: { title: sql`excluded.title`, data: sql`excluded.data`, updatedAt: sql`now()` },
      })
      .returning({ id: posts.id, sourceKey: posts.sourceKey })
    await tx
      .insert(postTags)
      .values(
        created.flatMap(({ id, sourceKey }) => {
          const tags = values.find((v) => v.sourceKey === sourceKey)?.tagIds
          return tags
            ? [
                { postId: id, entityType: 'player' as const, entityId: tags.player },
                { postId: id, entityType: 'team' as const, entityId: tags.team },
                { postId: id, entityType: 'event' as const, entityId: tags.event },
              ]
            : []
        }),
      )
      .onConflictDoNothing()
    return { cards: created.length }
  })
}

export function mapCompletedJob(db: Db): JobDefinition<{ mapId: string }> {
  return { name: MAP_COMPLETED, handler: (job) => createStatCards(db, job.data.mapId) }
}
