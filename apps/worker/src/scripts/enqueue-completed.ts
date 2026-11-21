// Dev helper: enqueue `series-completed` for every completed series (e.g. after `pnpm db:seed`).
import { createDb, eq, schema } from '@aced/db'
import { createJobQueues } from '@aced/jobs'
import { createQueueConnection } from '@aced/redis'
import { env } from '../env.js'
import { SERIES_COMPLETED } from '../jobs/series-completed.js'

const db = createDb(env.databaseUrl, { max: 1 })
const connection = createQueueConnection(env.redisUrl)
const queues = createJobQueues(connection)

const rows = await db
  .select({ id: schema.series.id })
  .from(schema.series)
  .where(eq(schema.series.status, 'completed'))
for (const { id } of rows) await queues.enqueue(SERIES_COMPLETED, { seriesId: id })
console.log(`Enqueued ${SERIES_COMPLETED} for ${rows.length} series`)

await queues.close()
connection.disconnect()
await db.$client.end()
