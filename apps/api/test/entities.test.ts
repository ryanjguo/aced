import { and, eq, gte, schema } from '@aced/db'
import type { PlayerDetail, TeamDetail } from '@aced/types'
import { afterAll, describe, expect, it } from 'vitest'
import { buildTestApp } from './build-test-app.js'

const { players, playerMapStats, maps } = schema

// Runs against `pnpm db:seed` data.
describe('player and team endpoints', () => {
  const app = buildTestApp()
  afterAll(() => app.close())

  it('returns a player with team, recent maps and 30-day averages', async () => {
    const res = await app.inject({ method: 'GET', url: '/players/kestrel' })
    expect(res.statusCode).toBe(200)
    const player = res.json<PlayerDetail>()
    expect(player).toMatchObject({ handle: 'Kestrel', team: { tag: 'NW' } })
    expect(player.recentMaps.length).toBeGreaterThan(0)
    expect(player.recentMaps.length).toBeLessThanOrEqual(10)
    expect(player.recentMaps[0]?.opponent?.tag).not.toBe('NW')

    const [row] = await app.db.select().from(players).where(eq(players.slug, 'kestrel'))
    const since = new Date(Date.now() - 30 * 864e5)
    const stats = await app.db
      .select({ s: playerMapStats })
      .from(playerMapStats)
      .innerJoin(maps, eq(maps.id, playerMapStats.mapId))
      .where(and(eq(playerMapStats.playerId, row?.id ?? ''), gte(maps.completedAt, since)))
    const sum = (f: (s: (typeof stats)[number]['s']) => number) =>
      stats.reduce((n, r) => n + f(r.s), 0)
    expect(player.averages?.maps).toBe(stats.length)
    expect(player.averages?.acs).toBeCloseTo(sum((s) => s.acs ?? 0) / stats.length, 6)
    expect(player.averages?.kd).toBeCloseTo(sum((s) => s.kills) / sum((s) => s.deaths), 6)
    expect(player.averages?.firstKillsPerMap).toBeCloseTo(
      sum((s) => s.firstKills ?? 0) / stats.length,
      6,
    )
  })

  it('returns a team with roster, results and upcoming series', async () => {
    const team = (await app.inject({ method: 'GET', url: '/teams/northwind' })).json<TeamDetail>()
    expect(team.team.name).toBe('Northwind')
    expect(team.roster).toHaveLength(5)
    expect(team.recent.every((s) => s.status === 'completed')).toBe(true)
    expect(team.upcoming.every((s) => s.status === 'scheduled' || s.status === 'live')).toBe(true)
    const plays = (s: TeamDetail['recent'][number]) =>
      s.teamA?.id === team.team.id || s.teamB?.id === team.team.id
    expect([...team.recent, ...team.upcoming].every(plays)).toBe(true)
    const times = team.upcoming.map((s) => Date.parse(s.scheduledAt))
    expect(times).toEqual([...times].sort((a, b) => a - b))
  })

  it('404s unknown slugs', async () => {
    expect((await app.inject({ method: 'GET', url: '/players/nobody' })).statusCode).toBe(404)
    expect((await app.inject({ method: 'GET', url: '/teams/nobody' })).statusCode).toBe(404)
  })
  it('lists sitemap entries', async () => {
    const res = await app.inject({ method: 'GET', url: '/sitemap/entries' })
    const entries = res.json<{
      boards: string[]
      teams: string[]
      players: string[]
      posts: unknown[]
    }>()
    expect(entries.boards).toContain('general')
    expect(entries.teams).toContain('northwind')
    expect(entries.players).toContain('kestrel')
    expect(entries.posts.length).toBeLessThanOrEqual(5000)
  })
})
