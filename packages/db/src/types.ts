import type {
  accounts,
  boards,
  comments,
  events,
  follows,
  maps,
  modActions,
  playerMapStats,
  players,
  posts,
  postTags,
  reports,
  rosterStints,
  series,
  sessions,
  teams,
  users,
  votes,
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
export type BoardRow = typeof boards.$inferSelect
// Loaded rows leave out the generated search vector (see apps/api/src/lib/post-columns.ts).
export type PostRow = Omit<typeof posts.$inferSelect, 'searchVector'>
export type CommentRow = typeof comments.$inferSelect
export type VoteRow = typeof votes.$inferSelect
export type ReportRow = typeof reports.$inferSelect
export type ModActionRow = typeof modActions.$inferSelect
export type PostTagRow = typeof postTags.$inferSelect
export type FollowRow = typeof follows.$inferSelect
