import { sql } from 'drizzle-orm'
import {
  check,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { citext, id, timestamps } from './columns.js'

export const region = pgEnum('region', ['americas', 'emea', 'pacific', 'china', 'international'])

export const seriesStatus = pgEnum('series_status', ['scheduled', 'live', 'completed', 'cancelled'])

export const events = pgTable(
  'events',
  {
    id: id(),
    gridId: text().notNull().unique(),
    name: text().notNull(),
    slug: citext().notNull().unique(),
    region: region(),
    startsAt: timestamp({ withTimezone: true }),
    endsAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [index().on(t.startsAt)],
)

export const teams = pgTable('teams', {
  id: id(),
  gridId: text().notNull().unique(),
  name: text().notNull(),
  tag: text().notNull(),
  slug: citext().notNull().unique(),
  region: region(),
  logoUrl: text(),
  ...timestamps,
})

export const players = pgTable(
  'players',
  {
    id: id(),
    gridId: text().notNull().unique(),
    handle: text().notNull(),
    slug: citext().notNull().unique(),
    realName: text(),
    country: text(), // ISO 3166-1 alpha-2
    // Denormalized for fast lookups; roster_stints is the source of truth.
    currentTeamId: uuid().references(() => teams.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [index().on(t.currentTeamId)],
)

export const rosterStints = pgTable(
  'roster_stints',
  {
    id: id(),
    playerId: uuid()
      .notNull()
      .references(() => players.id, { onDelete: 'cascade' }),
    teamId: uuid()
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    role: text(),
    joinedAt: timestamp({ withTimezone: true }),
    leftAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [index().on(t.playerId), index().on(t.teamId)],
)

export const series = pgTable(
  'series',
  {
    id: id(),
    gridId: text().notNull().unique(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    // Null while a bracket slot is still TBD.
    teamAId: uuid().references(() => teams.id, { onDelete: 'set null' }),
    teamBId: uuid().references(() => teams.id, { onDelete: 'set null' }),
    bestOf: smallint().notNull(),
    scheduledAt: timestamp({ withTimezone: true }).notNull(),
    status: seriesStatus().notNull().default('scheduled'),
    scoreA: smallint().notNull().default(0),
    scoreB: smallint().notNull().default(0),
    winnerId: uuid().references(() => teams.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [
    index().on(t.scheduledAt),
    index().on(t.eventId, t.scheduledAt),
    check('series_best_of_check', sql`${t.bestOf} in (1, 3, 5)`),
  ],
)

export const maps = pgTable(
  'maps',
  {
    id: id(),
    gridId: text().unique(),
    seriesId: uuid()
      .notNull()
      .references(() => series.id, { onDelete: 'cascade' }),
    order: smallint().notNull(), // 1-based position in the series
    mapName: text().notNull(),
    scoreA: smallint().notNull().default(0),
    scoreB: smallint().notNull().default(0),
    winnerId: uuid().references(() => teams.id, { onDelete: 'set null' }),
    completedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [unique().on(t.seriesId, t.order)],
)

export const playerMapStats = pgTable(
  'player_map_stats',
  {
    mapId: uuid()
      .notNull()
      .references(() => maps.id, { onDelete: 'cascade' }),
    playerId: uuid()
      .notNull()
      .references(() => players.id, { onDelete: 'cascade' }),
    teamId: uuid()
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    agent: text(),
    kills: smallint().notNull(),
    deaths: smallint().notNull(),
    assists: smallint().notNull(),
    acs: smallint(),
    adr: real(),
    firstKills: smallint(),
    firstDeaths: smallint(),
    headshotPct: real(),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.mapId, t.playerId] }), index().on(t.playerId)],
)
