import { randomUUID } from 'node:crypto'
import { type Db, eq, inArray, schema } from '@aced/db'

const { events, teams, players, series, maps, playerMapStats, posts } = schema

/**
 * Inserts an event, three teams of five players and two series between teams A and B:
 * a completed Bo3 (A wins 2–1, three maps with ordinary stat lines) and a scheduled one.
 * Grid ids and slugs are unique per call, so tests never touch seed rows or each other.
 */
export async function createEsportsFixture(db: Db) {
  const run = randomUUID().slice(0, 8)
  const [event] = await db
    .insert(events)
    .values({ gridId: `t-${run}-event`, name: `Test Cup ${run}`, slug: `test-cup-${run}` })
    .returning()
  if (!event) throw new Error('fixture insert failed')

  const teamRows = await db
    .insert(teams)
    .values(
      ['a', 'b', 'c'].map((k) => ({
        gridId: `t-${run}-team-${k}`,
        name: `Team ${k.toUpperCase()} ${run}`,
        tag: `T${k.toUpperCase()}`,
        slug: `team-${k}-${run}`,
      })),
    )
    .returning()
  const [a, b, c] = teamRows
  if (!a || !b || !c) throw new Error('fixture insert failed')

  const playerRows = await db
    .insert(players)
    .values(
      teamRows.flatMap((team, t) =>
        Array.from({ length: 5 }, (_, i) => ({
          gridId: `t-${run}-p${t}${i}`,
          handle: `P${t}${i}${run}`,
          slug: `p${t}${i}-${run}`,
          currentTeamId: team.id,
        })),
      ),
    )
    .returning()
  const roster = (teamId: string) => playerRows.filter((p) => p.currentTeamId === teamId)

  const [completed, scheduled] = await db
    .insert(series)
    .values([
      {
        gridId: `t-${run}-done`,
        eventId: event.id,
        teamAId: a.id,
        teamBId: b.id,
        bestOf: 3,
        scheduledAt: new Date(Date.now() - 86_400_000),
        status: 'completed' as const,
        scoreA: 2,
        scoreB: 1,
        winnerId: a.id,
      },
      {
        gridId: `t-${run}-next`,
        eventId: event.id,
        teamAId: a.id,
        teamBId: b.id,
        bestOf: 3,
        scheduledAt: new Date(Date.now() + 86_400_000),
      },
    ])
    .returning()
  if (!completed || !scheduled) throw new Error('fixture insert failed')

  const mapRows = await db
    .insert(maps)
    .values(
      [
        [13, 9, a.id],
        [10, 13, b.id],
        [13, 11, a.id],
      ].map(([scoreA, scoreB, winnerId], i) => ({
        seriesId: completed.id,
        order: i + 1,
        mapName: ['Ascent', 'Bind', 'Haven'][i] ?? 'Ascent',
        scoreA: scoreA as number,
        scoreB: scoreB as number,
        winnerId: winnerId as string,
        completedAt: new Date(),
      })),
    )
    .returning()
  await db.insert(playerMapStats).values(
    mapRows.flatMap((map) =>
      [...roster(a.id), ...roster(b.id)].map((p) => ({
        mapId: map.id,
        playerId: p.id,
        teamId: p.currentTeamId ?? '',
        agent: 'Sova',
        kills: 15,
        deaths: 14,
        assists: 5,
        acs: 200,
        adr: 140,
        firstKills: 2,
      })),
    ),
  )

  return {
    event,
    teams: { a, b, c },
    roster,
    completed,
    scheduled,
    /** Removes everything above plus posts generated for its series; deleting the event cascades. */
    cleanup: async () => {
      await db.delete(posts).where(inArray(posts.seriesId, [completed.id, scheduled.id]))
      await db.delete(events).where(eq(events.id, event.id))
      await db.delete(players).where(
        inArray(
          players.id,
          playerRows.map((p) => p.id),
        ),
      )
      await db.delete(teams).where(
        inArray(
          teams.id,
          teamRows.map((t) => t.id),
        ),
      )
    },
  }
}

export type EsportsFixture = Awaited<ReturnType<typeof createEsportsFixture>>
