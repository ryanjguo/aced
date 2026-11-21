import type {
  events,
  maps,
  playerMapStats,
  players,
  rosterStints,
  series,
  teams,
} from './schema/index.js'

export type EventRow = typeof events.$inferSelect
export type TeamRow = typeof teams.$inferSelect
export type PlayerRow = typeof players.$inferSelect
export type RosterStintRow = typeof rosterStints.$inferSelect
export type SeriesRow = typeof series.$inferSelect
export type MapRow = typeof maps.$inferSelect
export type PlayerMapStatRow = typeof playerMapStats.$inferSelect
