import { randomUUID } from 'node:crypto'
import { eq, inArray, schema } from '@aced/db'
import type { AcsLeader, TrendingEntity } from '@aced/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildTestApp, createUser } from './build-test-app.js'

const { events, teams, players, series, maps, playerMapStats, posts, postTags, users } = schema

describe('discovery', () => {
  const app = buildTestApp()
  const run = randomUUID().slice(0, 8)
  let authorId = ''
  let teamId = ''
  let eventId = ''
  const playerIds: string[] = []

  beforeAll(async () => {
    authorId = (await createUser(app, 'disc')).id
    const [event] = await app.db
      .insert(events)
      .values({ gridId: `d-${run}`, name: `Disc Cup ${run}`, slug: `disc-cup-${run}` })
      .returning()
    const [team] = await app.db
      .insert(teams)
      .values({ gridId: `d-${run}-t`, name: `Disc ${run}`, tag: 'DSC', slug: `disc-${run}` })
      .returning()
    eventId = event?.id ?? ''
    teamId = team?.id ?? ''
  })

  afterAll(async () => {
    await app.db.delete(posts).where(eq(posts.authorId, authorId))
    await app.db.delete(events).where(eq(events.id, eventId))
    await app.db.delete(players).where(inArray(players.id, playerIds))
    await app.db.delete(teams).where(eq(teams.id, teamId))
    await app.db.delete(users).where(eq(users.id, authorId))
    await app.redis.del('trending:24h', 'leaderboard:acs:7:5')
    await app.close()
  })

  const get = <T>(url: string) =>
    app.inject({ method: 'GET', url }).then((r) => r.json<{ items: T[] }>().items)

  it('ranks recently tagged entities and caches the result', async () => {
    await app.redis.del('trending:24h')
    const [post] = await app.db
      .insert(posts)
      .values({ kind: 'take', body: 'DSC looking good', authorId, score: 10_000 })
      .returning()
    await app.db
      .insert(postTags)
      .values({ postId: post?.id ?? '', entityType: 'team', entityId: teamId })
    const first = await get<TrendingEntity>('/trending')
    expect(first[0]).toMatchObject({ type: 'team', id: teamId, slug: `disc-${run}`, posts: 1 })

    // A second tagged post isn't counted until the 5-minute cache expires.
    const [again] = await app.db
      .insert(posts)
      .values({ kind: 'take', body: 'more DSC', authorId })
      .returning()
    await app.db
      .insert(postTags)
      .values({ postId: again?.id ?? '', entityType: 'team', entityId: teamId })
    expect((await get<TrendingEntity>('/trending'))[0]?.posts).toBe(1)
  })

  it('lists top average ACS over the window, needing 2 maps', async () => {
    await app.redis.del('leaderboard:acs:7:5')
    const made = await app.db
      .insert(players)
      .values(
        ['star', 'oneoff'].map((h) => ({
          gridId: `d-${run}-${h}`,
          handle: `${h}${run}`,
          slug: `${h}-${run}`,
          currentTeamId: teamId,
        })),
      )
      .returning()
    playerIds.push(...made.map((p) => p.id))
    const [star, oneoff] = made
    const [s] = await app.db
      .insert(series)
      .values({
        gridId: `d-${run}-s`,
        eventId,
        teamAId: teamId,
        bestOf: 3,
        scheduledAt: new Date(),
      })
      .returning()
    const mapRows = await app.db
      .insert(maps)
      .values(
        [1, 2].map((order) => ({
          seriesId: s?.id ?? '',
          order,
          mapName: 'Bind',
          completedAt: new Date(),
        })),
      )
      .returning()
    const line = { teamId, kills: 30, deaths: 10, assists: 5 }
    await app.db
      .insert(playerMapStats)
      .values([
        ...mapRows.map((m) => ({ ...line, mapId: m.id, playerId: star?.id ?? '', acs: 999 })),
        { ...line, mapId: mapRows[0]?.id ?? '', playerId: oneoff?.id ?? '', acs: 1000 },
      ])

    const items = await get<AcsLeader>('/leaderboards/acs?days=7&limit=5')
    expect(items[0]).toMatchObject({
      rank: 1,
      player: { slug: `star-${run}` },
      team: { tag: 'DSC' },
      acs: 999,
      maps: 2,
    })
    expect(items.some((l) => l.player.slug === `oneoff-${run}`)).toBe(false)
  })

  it('validates the query', async () => {
    expect((await app.inject({ method: 'GET', url: '/trending?window=1y' })).statusCode).toBe(400)
    expect((await app.inject({ method: 'GET', url: '/leaderboards/acs?days=90' })).statusCode).toBe(
      400,
    )
  })
})
