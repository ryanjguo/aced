import type { Series, Team } from '@aced/types'

// Placeholder data until the API serves real matches (#15). Teams are invented.

const team = (id: string, name: string, tag: string): Team => ({
  id,
  name,
  tag,
  slug: tag.toLowerCase(),
  region: 'americas',
  logoUrl: null,
})

const teams = {
  nw: team('t1', 'Northwind', 'NW'),
  ex: team('t2', 'Exhale', 'EXH'),
  vg: team('t3', 'Vanguard', 'VG'),
  hl: team('t4', 'Halcyon', 'HAL'),
  rk: team('t5', 'Rook Esports', 'RK'),
  sv: team('t6', 'Silverline', 'SVL'),
}

const event = { id: 'e1', name: 'Kickoff 2027 · Americas', slug: 'kickoff-2027-americas' }

const HOUR = 60 * 60 * 1000

export function fakeSeries(now = Date.now()): Series[] {
  const at = (hoursFromNow: number) => new Date(now + hoursFromNow * HOUR).toISOString()
  const base = { event, winnerId: null, bestOf: 3 as const }

  return [
    {
      ...base,
      id: 's1',
      teamA: teams.nw,
      teamB: teams.ex,
      scheduledAt: at(-50),
      status: 'completed',
      score: [2, 1],
      winnerId: teams.nw.id,
    },
    {
      ...base,
      id: 's2',
      teamA: teams.vg,
      teamB: teams.hl,
      scheduledAt: at(-47),
      status: 'completed',
      score: [0, 2],
      winnerId: teams.hl.id,
    },
    {
      ...base,
      id: 's3',
      teamA: teams.rk,
      teamB: teams.sv,
      scheduledAt: at(-26),
      status: 'completed',
      score: [2, 0],
      winnerId: teams.rk.id,
    },
    {
      ...base,
      id: 's4',
      teamA: teams.ex,
      teamB: teams.vg,
      scheduledAt: at(-1),
      status: 'live',
      score: [1, 0],
    },
    {
      ...base,
      id: 's5',
      teamA: teams.hl,
      teamB: teams.rk,
      scheduledAt: at(2),
      status: 'scheduled',
      score: [0, 0],
    },
    {
      ...base,
      id: 's6',
      teamA: teams.sv,
      teamB: teams.nw,
      scheduledAt: at(23),
      status: 'scheduled',
      score: [0, 0],
    },
    {
      ...base,
      id: 's7',
      teamA: teams.nw,
      teamB: null,
      scheduledAt: at(48),
      status: 'scheduled',
      score: [0, 0],
      bestOf: 5,
    },
  ]
}
