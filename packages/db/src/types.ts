import type {
  accounts,
  events,
  maps,
  playerMapStats,
  players,
  rosterStints,
  series,
  sessions,
  teams,
  users,
} from './schema/index.js'

export type EventRow = typeof events.$inferSelect
export type TeamRow = typeof teams.$inferSelect
export type PlayerRow = typeof players.$inferSelect
export type RosterStintRow = typeof rosterStints.$inferSelect
export type SeriesRow = typeof series.$inferSelect
export type MapRow = typeof maps.$inferSelect
export type PlayerMapStatRow = typeof playerMapStats.$inferSelect
export type UserRow = typeof users.$inferSelect
export type SessionRow = typeof sessions.$inferSelect
export type AccountRow = typeof accounts.$inferSelect
