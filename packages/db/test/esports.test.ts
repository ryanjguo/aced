import { randomUUID } from 'node:crypto'
import { eq, inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'
import { createDb } from '../src/client.js'
import { events, maps, playerMapStats, players, series, teams } from '../src/schema/index.js'

const url = process.env.DATABASE_URL
const db = url ? createDb(url, { max: 1 }) : undefined
const run = randomUUID().slice(0, 8)
const teamIds: string[] = []
const playerIds: string[] = []
let eventId: string | undefined

afterAll(async () => {
  if (!db) return
  if (eventId) await db.delete(events).where(eq(events.id, eventId))
  if (playerIds.length) await db.delete(players).where(inArray(players.id, playerIds))
  if (teamIds.length) await db.delete(teams).where(inArray(teams.id, teamIds))
})

describe.skipIf(!db)('esports schema', () => {
  it('stores and reads a series with maps and player stats', async () => {
    if (!db) return
    const [event] = await db
      .insert(events)
      .values({ gridId: `e-${run}`, name: 'Test Masters', slug: `test-masters-${run}` })
      .returning()
    eventId = event?.id

    const [teamA, teamB] = await db
      .insert(teams)
      .values([
        { gridId: `ta-${run}`, name: 'Team A', tag: 'TA', slug: `team-a-${run}` },
        { gridId: `tb-${run}`, name: 'Team B', tag: 'TB', slug: `team-b-${run}` },
      ])
      .returning()
    if (!event || !teamA || !teamB) throw new Error('insert failed')
    teamIds.push(teamA.id, teamB.id)

    const [player] = await db
      .insert(players)
      .values({
        gridId: `p-${run}`,
        handle: 'tester',
        slug: `tester-${run}`,
        currentTeamId: teamA.id,
      })
      .returning()
    if (!player) throw new Error('insert failed')
    playerIds.push(player.id)

    const [s] = await db
      .insert(series)
      .values({
        gridId: `s-${run}`,
        eventId: event.id,
        teamAId: teamA.id,
        teamBId: teamB.id,
        bestOf: 3,
        scheduledAt: new Date('2027-02-01T20:00:00Z'),
      })
      .returning()
    if (!s) throw new Error('insert failed')
    expect(s.status).toBe('scheduled')
    expect(s.scoreA).toBe(0)

    const [map] = await db
      .insert(maps)
      .values({
        seriesId: s.id,
        order: 1,
        mapName: 'Ascent',
        scoreA: 13,
        scoreB: 9,
        winnerId: teamA.id,
      })
      .returning()
    if (!map) throw new Error('insert failed')

    await db.insert(playerMapStats).values({
      mapId: map.id,
      playerId: player.id,
      teamId: teamA.id,
      kills: 31,
      deaths: 14,
      assists: 4,
      acs: 312,
    })

    const stats = await db.select().from(playerMapStats).where(eq(playerMapStats.mapId, map.id))
    expect(stats).toHaveLength(1)
    expect(stats[0]?.kills).toBe(31)
  })

  it('upserts on grid_id without duplicating', async () => {
    if (!db) return
    const gridId = `tu-${run}`
    for (const name of ['Before', 'After']) {
      await db
        .insert(teams)
        .values({ gridId, name, tag: 'UP', slug: `upsert-${run}` })
        .onConflictDoUpdate({ target: teams.gridId, set: { name } })
    }
    const rows = await db.select().from(teams).where(eq(teams.gridId, gridId))
    expect(rows).toHaveLength(1)
    expect(rows[0]?.name).toBe('After')
    if (rows[0]) teamIds.push(rows[0].id)
  })

  it('treats slugs case-insensitively', async () => {
    if (!db) return
    const [t] = await db
      .insert(teams)
      .values({ gridId: `tc-${run}`, name: 'Case', tag: 'CS', slug: `case-${run}` })
      .returning()
    if (t) teamIds.push(t.id)
    await expect(
      db
        .insert(teams)
        .values({ gridId: `tc2-${run}`, name: 'Case 2', tag: 'C2', slug: `CASE-${run}` }),
    ).rejects.toThrow()
  })

  it('rejects an invalid best-of', async () => {
    if (!db || !eventId) return
    await expect(
      db.insert(series).values({
        gridId: `sb-${run}`,
        eventId,
        bestOf: 2,
        scheduledAt: new Date(),
      }),
    ).rejects.toThrow()
  })
})
