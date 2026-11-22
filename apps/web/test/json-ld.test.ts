import type { SeriesDetail } from '@aced/types'
import { describe, expect, it } from 'vitest'
import { seriesJsonLd } from '@/lib/json-ld'

const team = (name: string) => ({ id: name, name, tag: name.slice(0, 3), slug: name.toLowerCase() })
const series = {
  id: 's1',
  event: { id: 'e1', name: 'Kickoff', slug: 'kickoff' },
  teamA: team('Northwind'),
  teamB: null,
  bestOf: 3,
  scheduledAt: '2026-11-22T18:00:00.000Z',
  status: 'scheduled',
  score: [0, 0],
  winnerId: null,
  maps: [],
} as unknown as SeriesDetail

describe('seriesJsonLd', () => {
  it('describes the series as a SportsEvent with its teams and event', () => {
    expect(seriesJsonLd(series)).toMatchObject({
      '@type': 'SportsEvent',
      name: 'Northwind vs TBD · Kickoff',
      startDate: '2026-11-22T18:00:00.000Z',
      eventStatus: 'https://schema.org/EventScheduled',
      url: expect.stringMatching(/\/matches\/s1$/),
      superEvent: { name: 'Kickoff', url: expect.stringMatching(/\/events\/kickoff$/) },
      competitor: [{ '@type': 'SportsTeam', name: 'Northwind' }],
    })
  })

  it('marks cancelled series', () => {
    expect(seriesJsonLd({ ...series, status: 'cancelled' }).eventStatus).toBe(
      'https://schema.org/EventCancelled',
    )
  })
})
