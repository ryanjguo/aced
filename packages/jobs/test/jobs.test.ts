import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { createQueueConnection } from '@aced/redis'
import { Worker } from 'bullmq'
import { afterAll, describe, expect, it } from 'vitest'
import { createJobQueues } from '../src/index.js'

const url = process.env.REDIS_URL

describe.skipIf(!url)('job queues', () => {
  const connection = createQueueConnection(url ?? '')
  const jobs = createJobQueues(connection)
  const name = `test-${randomUUID()}`

  afterAll(async () => {
    await jobs.queue(name).obliterate({ force: true })
    await jobs.close()
    connection.disconnect()
  })

  it('runs an enqueued job', async () => {
    const seen: unknown[] = []
    const worker = new Worker(name, async (job) => seen.push(job.data), { connection })
    await jobs.enqueue(name, { hello: 'world' })
    await once(worker, 'completed')
    await worker.close()
    expect(seen).toEqual([{ hello: 'world' }])
  })
})
