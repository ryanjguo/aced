import { createDb, eq, inArray, like, schema } from '@aced/db'
import type { StatCardData } from '@aced/types'
import { afterAll, describe, expect, it } from 'vitest'
import { createStatCards } from '../src/jobs/map-completed.js'

const url = process.env.DATABASE_URL
const { series, maps, playerMapStats, players, posts, postTags } = schema

// Builds a map on a seeded series (`pnpm db:seed`).
describe.skipIf(!url)('map-completed job', () => {
  const db = createDb(url ?? '', { max: 1 })
  let mapId = ''

  afterAll(async () => {
    await db.delete(posts).where(like(posts.sourceKey, `stat_card:${mapId}:%`))
    await db.delete(maps).where(eq(maps.id, mapId))
    await db.$client.end()
  })

  it('creates at most 3 cards for standout players, highest ACS first, idempotently', async () => {
    const [s] = await db.select().from(series).where(eq(series.gridId, 'seed-series-3'))
    if (!s?.teamAId) throw new Error('Run pnpm db:seed')
    const roster = await db.select().from(players).where(eq(players.currentTeamId, s.teamAId))
    const [map] = await db
      .insert(maps)
      .values({
        seriesId: s.id,
        order: 99,
        mapName: 'Bind',
        scoreA: 13,
        scoreB: 7,
        winnerId: s.teamAId,
        completedAt: new Date(),
      })
      .returning()
    mapId = map?.id ?? ''
    // 4 standouts (kills, ACS, first kills, kills) and one ordinary line.
    const lines = [
      { kills: 31, acs: 300, firstKills: 1 },
      { kills: 20, acs: 360, firstKills: 1 },
      { kills: 18, acs: 250, firstKills: 7 },
      { kills: 30, acs: 310, firstKills: 2 },
      { kills: 12, acs: 180, firstKills: 0 },
    ]
    await db.insert(playerMapStats).values(
      lines.map((l, i) => ({
        mapId,
        playerId: roster[i]?.id ?? '',
        teamId: s.teamAId ?? '',
        agent: 'Jett',
        deaths: 14,
        assists: 3,
        adr: 150,
        ...l,
      })),
    )

    await createStatCards(db, mapId)
    await createStatCards(db, mapId)

    const cards = await db
      .select()
      .from(posts)
      .where(like(posts.sourceKey, `stat_card:${mapId}:%`))
    expect(cards).toHaveLength(3)
    const data = cards.map((c) => c.data as StatCardData)
    expect(data.map((d) => d.line.acs).sort()).toEqual([300, 310, 360])
    expect(data.find((d) => d.line.acs === 360)?.highlight).toBe('350+ ACS')
    expect(data.find((d) => d.line.kills === 31)).toMatchObject({
      highlight: '30+ kills',
      won: true,
    })
    expect(cards[0]?.title).toMatch(/went \d+\/14 on Bind vs /)

    const tags = await db
      .select()
      .from(postTags)
      .where(
        inArray(
          postTags.postId,
          cards.map((c) => c.id),
        ),
      )
    expect(tags).toHaveLength(9)
  })
})
