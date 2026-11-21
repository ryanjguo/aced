// Dev helper: move a seed player to another team and enqueue `roster-changed`.
// Usage: pnpm --filter @aced/worker roster:simulate <player-slug> <team-slug>
import { createDb, eq, schema } from '@aced/db'
import { createJobQueues } from '@aced/jobs'
import { createQueueConnection } from '@aced/redis'
import { env } from '../env.js'
import { ROSTER_CHANGED, type RosterChange } from '../jobs/roster-changed.js'

const [playerSlug, teamSlug] = process.argv.slice(2)
if (!playerSlug || !teamSlug) throw new Error('Usage: roster:simulate <player-slug> <team-slug>')

const db = createDb(env.databaseUrl, { max: 1 })
const [player] = await db.select().from(schema.players).where(eq(schema.players.slug, playerSlug))
const [team] = await db.select().from(schema.teams).where(eq(schema.teams.slug, teamSlug))
if (!player || !team) throw new Error('Unknown player or team')
if (player.currentTeamId === team.id)
  throw new Error(`${player.handle} already plays for ${team.name}`)

await db
  .update(schema.players)
  .set({ currentTeamId: team.id })
  .where(eq(schema.players.id, player.id))
const change: RosterChange = {
  playerId: player.id,
  fromTeamId: player.currentTeamId,
  toTeamId: team.id,
}
const connection = createQueueConnection(env.redisUrl)
const queues = createJobQueues(connection)
await queues.enqueue(ROSTER_CHANGED, change)
console.log(`Moved ${player.handle} to ${team.name} and enqueued ${ROSTER_CHANGED}`)

await queues.close()
connection.disconnect()
await db.$client.end()
