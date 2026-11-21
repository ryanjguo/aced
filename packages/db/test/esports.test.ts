import { randomUUID } from 'node:crypto'
import { eq, inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'
import { createDb } from '../src/client.js'
import { events, maps, playerMapStats, players, series, teams } from '../src/schema/index.js'

const url = process.env.DATABASE_URL

function first<T>(rows: T[]): T {
  const row = rows[0]
  if (!row) throw new Error('expected a row')
  return row
}

describe.skipIf(!url)('esports schema', () => {
  const db = createDb(url ?? '', { max: 1 })
  const run = randomUUID().slice(0, 8)
  const teamIds: string[] = []
  const playerIds: string[] = []
  const eventIds: string[] = []

  const insertTeam = async (key: string, slug = `${key}-${run}`) => {
    const team = first(
      await db
        .insert(teams)
        .values({ gridId: `${key}-${run}`, name: key, tag: key, slug })
        .returning(),
    )
    teamIds.push(team.id)
    return team
  }

  const insertEvent = async () => {
    const event = first(
      await db
        .insert(events)
        .values({ gridId: `e-${run}`, name: 'Test Masters', slug: `test-masters-${run}` })
        .returning(),
    )
    eventIds.push(event.id)
    return event
  }

  afterAll(async () => {
    await db.delete(events).where(inArray(events.id, eventIds))
    await db.delete(players).where(inArray(players.id, playerIds))
    await db.delete(teams).where(inArray(teams.id, teamIds))
  })

  it('stores and reads a series with maps and player stats', async () => {
    const event = await insertEvent()
    const teamA = await insertTeam('ta')
    const teamB = await insertTeam('tb')
    const player = first(
      await db
        .insert(players)
        .values({
          gridId: `p-${run}`,
          handle: 'tester',
          slug: `tester-${run}`,
          currentTeamId: teamA.id,
        })
        .returning(),
    )
    playerIds.push(player.id)

    const s = first(
      await db
        .insert(series)
        .values({
          gridId: `s-${run}`,
          eventId: event.id,
          teamAId: teamA.id,
          teamBId: teamB.id,
          bestOf: 3,
          scheduledAt: new Date('2027-02-01T20:00:00Z'),
        })
        .returning(),
    )
    expect(s.status).toBe('scheduled')
    expect(s.scoreA).toBe(0)

    const map = first(
      await db
        .insert(maps)
        .values({
          seriesId: s.id,
          order: 1,
          mapName: 'Ascent',
          scoreA: 13,
          scoreB: 9,
          winnerId: teamA.id,
        })
        .returning(),
    )
    await db.insert(playerMapStats).values({
      mapId: map.id,
      playerId: player.id,
      teamId: teamA.id,
      kills: 31,
      deaths: 14,
      assists: 4,
    })

    const stats = await db.select().from(playerMapStats).where(eq(playerMapStats.mapId, map.id))
    expect(stats).toHaveLength(1)
    expect(stats[0]?.kills).toBe(31)
  })

  it('upserts on grid_id without duplicating', async () => {
    const gridId = `tu-${run}`
    for (const name of ['Before', 'After']) {
      await db
        .insert(teams)
        .values({ gridId, name, tag: 'UP', slug: `upsert-${run}` })
        .onConflictDoUpdate({ target: teams.gridId, set: { name } })
    }
    const rows = await db.select().from(teams).where(eq(teams.gridId, gridId))
    teamIds.push(...rows.map((r) => r.id))
    expect(rows).toHaveLength(1)
    expect(rows[0]?.name).toBe('After')
  })

  it('treats slugs case-insensitively', async () => {
    await insertTeam('case', `case-${run}`)
    await expect(insertTeam('case2', `CASE-${run}`)).rejects.toThrow()
  })

  it('rejects an invalid best-of', async () => {
    const eventId = eventIds[0] ?? (await insertEvent()).id
    await expect(
      db
        .insert(series)
        .values({ gridId: `sb-${run}`, eventId, bestOf: 2, scheduledAt: new Date() }),
    ).rejects.toThrow()
  })
})
