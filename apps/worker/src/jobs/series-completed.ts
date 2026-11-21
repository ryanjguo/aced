import { asc, type Db, eq, inArray, schema, sql } from '@aced/db'
import type { JobDefinition } from '@aced/jobs'
import { hotScore } from '@aced/ranking'
import type { ResultCardData } from '@aced/types'

const { series, teams, events, maps, posts, postTags, boards } = schema

export const SERIES_COMPLETED = 'series-completed'

/**
 * Creates the result card and match thread for a completed series. Upserts on deterministic
 * source keys, so reruns update scores instead of duplicating posts.
 */
export async function createSeriesPosts(db: Db, seriesId: string) {
  const [row] = await db.select().from(series).where(eq(series.id, seriesId))
  if (row?.status !== 'completed') return { skipped: true }
  const teamIds = [row.teamAId, row.teamBId].filter((id): id is string => id !== null)
  const [teamRows, [event], mapRows, [board]] = await Promise.all([
    db.select().from(teams).where(inArray(teams.id, teamIds)),
    db.select().from(events).where(eq(events.id, row.eventId)),
    db.select().from(maps).where(eq(maps.seriesId, row.id)).orderBy(asc(maps.order)),
    db.select().from(boards).where(eq(boards.slug, 'match-threads')),
  ])
  const teamA = teamRows.find((t) => t.id === row.teamAId)
  const teamB = teamRows.find((t) => t.id === row.teamBId)
  if (!teamA || !teamB || !event) return { skipped: true }

  const card = (t: typeof teamA) => ({ name: t.name, tag: t.tag, slug: t.slug })
  const data: ResultCardData = {
    type: 'result',
    seriesId: row.id,
    event: { name: event.name, slug: event.slug },
    teamA: card(teamA),
    teamB: card(teamB),
    score: [row.scoreA, row.scoreB],
    winner: row.winnerId === teamA.id ? 'a' : row.winnerId === teamB.id ? 'b' : null,
    maps: mapRows.map((m) => ({ name: m.mapName, score: [m.scoreA, m.scoreB] })),
  }
  const score = `${row.scoreA}–${row.scoreB}`
  const createdAt = new Date()

  return db.transaction(async (tx) => {
    const created = await tx
      .insert(posts)
      .values([
        {
          kind: 'result',
          sourceKey: `result:${row.id}`,
          title: `${teamA.name} ${score} ${teamB.name}`,
          body: '',
          seriesId: row.id,
          data,
          createdAt,
          hotScore: hotScore(0, createdAt),
        },
        {
          kind: 'match_thread',
          sourceKey: `match_thread:${row.id}`,
          boardId: board?.id ?? null,
          title: `Match thread: ${teamA.name} vs ${teamB.name} · ${event.name}`,
          body: `${teamA.name} ${score} ${teamB.name}. Discuss the series here.`,
          seriesId: row.id,
          createdAt,
          hotScore: hotScore(0, createdAt),
        },
      ])
      .onConflictDoUpdate({
        target: posts.sourceKey,
        set: {
          title: sql`excluded.title`,
          body: sql`excluded.body`,
          data: sql`excluded.data`,
          updatedAt: sql`now()`,
        },
      })
      .returning({ id: posts.id })

    await tx
      .insert(postTags)
      .values(
        created.flatMap(({ id }) => [
          { postId: id, entityType: 'team' as const, entityId: teamA.id },
          { postId: id, entityType: 'team' as const, entityId: teamB.id },
          { postId: id, entityType: 'event' as const, entityId: event.id },
        ]),
      )
      .onConflictDoNothing()
    return { posts: created.length }
  })
}

export function seriesCompletedJob(db: Db): JobDefinition<{ seriesId: string }> {
  return { name: SERIES_COMPLETED, handler: (job) => createSeriesPosts(db, job.data.seriesId) }
}
