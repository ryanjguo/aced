// Dev helper: enqueue `series-completed` and `map-completed` for finished series and maps
// (e.g. after `pnpm db:seed`).
import { createDb, eq, isNotNull, schema } from '@aced/db'
import { createJobQueues } from '@aced/jobs'
import { createQueueConnection } from '@aced/redis'
import { env } from '../env.js'
import { MAP_COMPLETED } from '../jobs/map-completed.js'
import { SERIES_COMPLETED } from '../jobs/series-completed.js'

const db = createDb(env.databaseUrl, { max: 1 })
const connection = createQueueConnection(env.redisUrl)
const queues = createJobQueues(connection)

const rows = await db
  .select({ id: schema.series.id })
  .from(schema.series)
  .where(eq(schema.series.status, 'completed'))
for (const { id } of rows) await queues.enqueue(SERIES_COMPLETED, { seriesId: id })
const mapRows = await db
  .select({ id: schema.maps.id })
  .from(schema.maps)
  .where(isNotNull(schema.maps.completedAt))
for (const { id } of mapRows) await queues.enqueue(MAP_COMPLETED, { mapId: id })
console.log(`Enqueued ${rows.length} series and ${mapRows.length} maps`)

await queues.close()
connection.disconnect()
await db.$client.end()
