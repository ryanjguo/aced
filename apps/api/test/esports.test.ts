import { eq, schema } from '@aced/db'
import type { EventDetail, SeriesDetail, SeriesList } from '@aced/types'
import { afterAll, describe, expect, it } from 'vitest'
import { buildTestApp } from './build-test-app.js'

// Runs against `pnpm db:seed` data.
describe('series and events', () => {
  const app = buildTestApp()
  afterAll(() => app.close())

  const seedSeriesId = async (gridId: string) => {
    const [row] = await app.db
      .select({ id: schema.series.id })
      .from(schema.series)
      .where(eq(schema.series.gridId, gridId))
    if (!row) throw new Error(`Run pnpm db:seed (missing ${gridId})`)
    return row.id
  }

  it('lists series in the default window, ordered by time', async () => {
    const res = await app.inject({ method: 'GET', url: '/series' })
    expect(res.statusCode).toBe(200)
    const { items } = res.json<SeriesList>()
    const times = items.map((s) => Date.parse(s.scheduledAt))
    expect(times).toEqual([...times].sort((a, b) => a - b))
    expect(Math.min(...times)).toBeGreaterThanOrEqual(Date.now() - 3 * 864e5 - 60_000)
    expect(Math.max(...times)).toBeLessThanOrEqual(Date.now() + 7 * 864e5)
    expect(items.some((s) => s.status === 'live')).toBe(true)
    expect(items.some((s) => s.teamB === null)).toBe(true)
  })

  it('filters by status and event', async () => {
    const { items: all } = (await app.inject({ method: 'GET', url: '/series' })).json<SeriesList>()
    const eventId = all[0]?.event.id
    const res = await app.inject({
      method: 'GET',
      url: `/series?status=completed&eventId=${eventId}&from=2000-01-01`,
    })
    const { items } = res.json<SeriesList>()
    expect(items.length).toBeGreaterThan(0)
    expect(items.every((s) => s.status === 'completed' && s.event.id === eventId)).toBe(true)
  })

  it('rejects an invalid status', async () => {
    const res = await app.inject({ method: 'GET', url: '/series?status=nope' })
    expect(res.statusCode).toBe(400)
  })

  it('returns a series with maps and stats', async () => {
    const id = await seedSeriesId('seed-series-1')
    const res = await app.inject({ method: 'GET', url: `/series/${id}` })
    const series = res.json<SeriesDetail>()
    expect(series.status).toBe('completed')
    expect(series.maps.map((m) => m.order)).toEqual(series.maps.map((_, i) => i + 1))
    for (const map of series.maps) {
      expect(map.stats).toHaveLength(10)
      expect(map.stats[0]).toMatchObject({ player: { handle: expect.any(String) } })
    }
  })

  it('returns 404 for an unknown series', async () => {
    const res = await app.inject({ method: 'GET', url: `/series/${crypto.randomUUID()}` })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toMatchObject({ error: { code: 'not_found' } })
  })

  it('returns an event with its series', async () => {
    const res = await app.inject({ method: 'GET', url: '/events/STAGE-1-2027-americas' })
    const { event, series } = res.json<EventDetail>()
    expect(event.slug).toBe('stage-1-2027-americas')
    expect(series).toHaveLength(14)
    expect(series.every((s) => s.event.id === event.id)).toBe(true)
  })

  it('returns 404 for an unknown event', async () => {
    const res = await app.inject({ method: 'GET', url: '/events/nope' })
    expect(res.statusCode).toBe(404)
  })
})
