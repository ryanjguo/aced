import { createDb, inArray, like, schema } from '@aced/db'
import type { StatCardData } from '@aced/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createStatCards } from '../src/jobs/map-completed.js'
import { createEsportsFixture, type EsportsFixture } from './fixtures.js'

const url = process.env.DATABASE_URL
const { maps, playerMapStats, posts, postTags } = schema

describe.skipIf(!url)('map-completed job', () => {
  const db = createDb(url ?? '', { max: 1 })
  let mapId = ''
  let fx: EsportsFixture | undefined

  beforeAll(async () => {
    fx = await createEsportsFixture(db)
  })
  // Maps, stats and stat cards belong to the fixture's series, so its cleanup removes them.
  afterAll(async () => {
    await fx?.cleanup()
    await db.$client.end()
  })

  it('creates at most 3 cards for standout players, highest ACS first, idempotently', async () => {
    const s = fx?.completed
    if (!s?.teamAId || !fx) throw new Error('fixture missing')
    const roster = fx.roster(s.teamAId)
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

  it('makes no cards when no standout belongs to a team in the series', async () => {
    if (!fx) throw new Error('fixture missing')
    const s = fx.completed
    const stray = fx.teams.c
    const [player] = fx.roster(stray.id)
    const [map] = await db
      .insert(maps)
      .values({
        seriesId: s.id,
        order: 98,
        mapName: 'Haven',
        scoreA: 13,
        scoreB: 2,
        completedAt: new Date(),
      })
      .returning()
    const strayMapId = map?.id ?? ''
    await db.insert(playerMapStats).values({
      mapId: strayMapId,
      playerId: player?.id ?? '',
      teamId: stray?.id ?? '',
      kills: 33,
      deaths: 10,
      assists: 2,
    })
    await expect(createStatCards(db, strayMapId)).resolves.toEqual({ cards: 0 })
  })
})
