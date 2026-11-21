import { inArray, sql } from 'drizzle-orm'
import { createDb } from './client.js'
import {
  events,
  maps,
  playerMapStats,
  players,
  rosterStints,
  series,
  teams,
} from './schema/index.js'

try {
  process.loadEnvFile('../../.env')
} catch {}

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set')
if (process.env.NODE_ENV === 'production' || url.includes('railway')) {
  throw new Error('Refusing to seed a production database')
}

// Seeded PRNG so every run writes the same stats.
let state = 42
function rand() {
  state = (state + 0x6d2b79f5) | 0
  let t = Math.imul(state ^ (state >>> 15), 1 | state)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1))
const pick = <T>(items: readonly T[]): T => items[int(0, items.length - 1)] as T

const HOUR = 60 * 60 * 1000
const at = (hoursFromNow: number) => new Date(Date.now() + hoursFromNow * HOUR)

const TEAMS = [
  ['Northwind', 'NW'],
  ['Exhale', 'EXH'],
  ['Vanguard', 'VG'],
  ['Halcyon', 'HAL'],
  ['Rook Esports', 'RK'],
  ['Silverline', 'SVL'],
  ['Emberfall', 'EMB'],
  ['Driftwood', 'DRW'],
] as const

const HANDLES = [
  'kestrel',
  'vexa',
  'mordant',
  'lumen',
  'quill',
  'brisk',
  'sable',
  'tundra',
  'rift',
  'ozzy',
  'glint',
  'harrow',
  'nyx',
  'pallas',
  'corvo',
  'flint',
  'wisp',
  'zephyr',
  'basalt',
  'kite',
  'ember',
  'solace',
  'drift',
  'onyx',
  'pike',
  'rune',
  'talon',
  'vesper',
  'cinder',
  'moss',
  'jolt',
  'larch',
  'mirage',
  'nova',
  'prism',
  'quarry',
  'reed',
  'skiff',
  'thorn',
  'umber',
] as const

const MAPS = ['Ascent', 'Bind', 'Haven', 'Lotus', 'Split', 'Sunset', 'Icebox'] as const
const AGENTS = [
  'Jett',
  'Omen',
  'Sova',
  'Killjoy',
  'Skye',
  'Raze',
  'Viper',
  'Fade',
  'Cypher',
] as const

interface SeriesPlan {
  event: 0 | 1
  teams: [number, number | null]
  hours: number
  status: 'completed' | 'live' | 'scheduled'
  bestOf?: 3 | 5
}

// Event 0 is past, event 1 is current. Times are relative to now.
const SERIES: SeriesPlan[] = [
  { event: 0, teams: [0, 1], hours: -24 * 20, status: 'completed' },
  { event: 0, teams: [2, 3], hours: -24 * 20 + 3, status: 'completed' },
  { event: 0, teams: [4, 5], hours: -24 * 19, status: 'completed' },
  { event: 0, teams: [6, 7], hours: -24 * 19 + 3, status: 'completed' },
  { event: 0, teams: [0, 3], hours: -24 * 17, status: 'completed' },
  { event: 0, teams: [4, 7], hours: -24 * 15, status: 'completed', bestOf: 5 },
  { event: 1, teams: [1, 2], hours: -24 * 6, status: 'completed' },
  { event: 1, teams: [3, 4], hours: -24 * 6 + 3, status: 'completed' },
  { event: 1, teams: [5, 6], hours: -24 * 5, status: 'completed' },
  { event: 1, teams: [7, 0], hours: -24 * 5 + 3, status: 'completed' },
  { event: 1, teams: [1, 3], hours: -24 * 3, status: 'completed' },
  { event: 1, teams: [2, 4], hours: -24 * 3 + 3, status: 'completed' },
  { event: 1, teams: [5, 7], hours: -26, status: 'completed' },
  { event: 1, teams: [6, 0], hours: -23, status: 'completed' },
  { event: 1, teams: [1, 4], hours: -1, status: 'live' },
  { event: 1, teams: [2, 5], hours: 3, status: 'scheduled' },
  { event: 1, teams: [3, 6], hours: 26, status: 'scheduled' },
  { event: 1, teams: [7, 1], hours: 50, status: 'scheduled' },
  { event: 1, teams: [0, 2], hours: 74, status: 'scheduled', bestOf: 5 },
  { event: 1, teams: [4, null], hours: 120, status: 'scheduled', bestOf: 5 },
]

const db = createDb(url, { max: 1 })
const touch = { updatedAt: sql`now()` }

const eventRows = await db
  .insert(events)
  .values([
    {
      gridId: 'seed-event-1',
      name: 'Kickoff 2027 · Americas',
      slug: 'kickoff-2027-americas',
      region: 'americas',
      startsAt: at(-24 * 21),
      endsAt: at(-24 * 14),
    },
    {
      gridId: 'seed-event-2',
      name: 'Stage 1 2027 · Americas',
      slug: 'stage-1-2027-americas',
      region: 'americas',
      startsAt: at(-24 * 7),
      endsAt: at(24 * 14),
    },
  ])
  .onConflictDoUpdate({
    target: events.gridId,
    set: { startsAt: sql`excluded.starts_at`, endsAt: sql`excluded.ends_at` },
  })
  .returning()

const teamRows = await db
  .insert(teams)
  .values(
    TEAMS.map(([name, tag], i) => ({
      gridId: `seed-team-${i + 1}`,
      name,
      tag,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      region: 'americas' as const,
    })),
  )
  .onConflictDoUpdate({ target: teams.gridId, set: touch })
  .returning()

const playerRows = await db
  .insert(players)
  .values(
    HANDLES.map((handle, i) => ({
      gridId: `seed-player-${i + 1}`,
      handle: handle.charAt(0).toUpperCase() + handle.slice(1),
      slug: handle,
      country: pick(['US', 'CA', 'BR', 'AR', 'CL', 'MX']),
      currentTeamId: teamRows[Math.floor(i / 5)]?.id,
    })),
  )
  .onConflictDoUpdate({
    target: players.gridId,
    set: { currentTeamId: sql`excluded.current_team_id`, updatedAt: sql`now()` },
  })
  .returning()

// Stints have no natural key, so replace the seed players' stints.
await db.delete(rosterStints).where(
  inArray(
    rosterStints.playerId,
    playerRows.map((p) => p.id),
  ),
)
await db.insert(rosterStints).values(
  playerRows.map((p, i) => ({
    playerId: p.id,
    teamId: teamRows[Math.floor(i / 5)]?.id as string,
    joinedAt: at(-24 * 120),
  })),
)

const roster = (teamId: string) => playerRows.filter((p) => p.currentTeamId === teamId)

function mapScore(): [number, number] {
  return rand() < 0.15 ? [14, 12] : [13, int(3, 11)]
}

for (const [i, plan] of SERIES.entries()) {
  const bestOf = plan.bestOf ?? 3
  const [a, b] = plan.teams
  const teamA = teamRows[a]
  const teamB = b === null ? undefined : teamRows[b]
  if (!teamA) throw new Error('missing seed team')

  // Play out maps until a team wins; a live series stops after one finished map.
  const results: { winner: 0 | 1; score: [number, number]; done: boolean }[] = []
  if (plan.status !== 'scheduled') {
    const needed = Math.ceil(bestOf / 2)
    const wins = [0, 0]
    while (Math.max(...wins) < needed) {
      const winner = rand() < 0.5 ? 0 : 1
      const [w, l] = mapScore()
      results.push({ winner, score: winner === 0 ? [w, l] : [l, w], done: true })
      wins[winner] = (wins[winner] ?? 0) + 1
      if (plan.status === 'live') {
        results.push({ winner: 0, score: [int(2, 9), int(2, 9)], done: false })
        break
      }
    }
  }
  const finished = results.filter((r) => r.done)
  const scoreA = finished.filter((r) => r.winner === 0).length
  const scoreB = finished.length - scoreA
  const winnerId =
    plan.status === 'completed' ? (scoreA > scoreB ? teamA.id : teamB?.id) : undefined

  const [row] = await db
    .insert(series)
    .values({
      gridId: `seed-series-${i + 1}`,
      eventId: eventRows[plan.event]?.id as string,
      teamAId: teamA.id,
      teamBId: teamB?.id ?? null,
      bestOf,
      scheduledAt: at(plan.hours),
      status: plan.status,
      scoreA,
      scoreB,
      winnerId: winnerId ?? null,
    })
    .onConflictDoUpdate({
      target: series.gridId,
      set: { scheduledAt: sql`excluded.scheduled_at`, updatedAt: sql`now()` },
    })
    .returning()
  if (!row || !teamB) continue

  for (const [m, result] of results.entries()) {
    const [map] = await db
      .insert(maps)
      .values({
        gridId: `seed-series-${i + 1}-map-${m + 1}`,
        seriesId: row.id,
        order: m + 1,
        mapName: MAPS[(i + m) % MAPS.length] as string,
        scoreA: result.score[0],
        scoreB: result.score[1],
        winnerId: result.done ? (result.winner === 0 ? teamA.id : teamB.id) : null,
        completedAt: result.done ? at(plan.hours + m + 1) : null,
      })
      .onConflictDoUpdate({ target: maps.gridId, set: touch })
      .returning()
    if (!map || !result.done) continue

    const rounds = result.score[0] + result.score[1]
    await db
      .insert(playerMapStats)
      .values(
        [
          ...roster(teamA.id).map((p) => [p, teamA] as const),
          ...roster(teamB.id).map((p) => [p, teamB] as const),
        ].map(([player, team]) => {
          const kills = int(6, 30)
          return {
            mapId: map.id,
            playerId: player.id,
            teamId: team.id,
            agent: pick(AGENTS),
            kills,
            deaths: int(8, 22),
            assists: int(1, 12),
            acs: Math.round((kills * 150 + int(500, 1500)) / rounds),
            adr: Math.round(((kills * 140 + int(400, 1400)) / rounds) * 10) / 10,
            firstKills: int(0, 6),
            firstDeaths: int(0, 6),
            headshotPct: int(15, 35),
          }
        }),
      )
      .onConflictDoNothing()
  }
}

console.log(
  `Seeded ${eventRows.length} events, ${teamRows.length} teams, ${playerRows.length} players, ${SERIES.length} series`,
)
await db.$client.end()
