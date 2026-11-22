import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { createQueueConnection } from '@aced/redis'
import { Worker } from 'bullmq'
import { afterAll, describe, expect, it } from 'vitest'
import { createJobQueues, isFinalFailure, type Job, KEEP } from '../src/index.js'

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

  it('retries a failed job with backoff until it succeeds', async () => {
    let calls = 0
    const worker = new Worker(
      name,
      async () => {
        calls++
        if (calls === 1) throw new Error('transient')
      },
      { connection },
    )
    const job = await jobs.enqueue(name)
    expect(job.opts).toMatchObject({ attempts: 5, backoff: { type: 'exponential', delay: 5000 } })
    await once(worker, 'completed')
    await worker.close()
    expect(calls).toBe(2)
  }, 15_000)

  it('trims finished runs of scheduled jobs', async () => {
    const sched = `${name}-sched`
    const queue = jobs.queue(sched)
    let runs = 0
    const worker = new Worker(sched, async () => void runs++, { connection })
    // Same template the worker uses, with a tiny limit so the test is quick.
    await queue.upsertJobScheduler(
      sched,
      { every: 100 },
      { opts: { ...KEEP.scheduled, removeOnComplete: 2 } },
    )
    while (runs < 5) await new Promise((r) => setTimeout(r, 100))
    await queue.removeJobScheduler(sched)
    await worker.close()
    expect(await queue.getCompletedCount()).toBeLessThanOrEqual(2)
    await queue.obliterate({ force: true })
  }, 10_000)
})

describe('isFinalFailure', () => {
  const job = (attemptsMade: number, attempts?: number) =>
    ({ attemptsMade, opts: { attempts } }) as unknown as Job
  it('is true only once the last attempt has failed', () => {
    expect(isFinalFailure(job(1, 5))).toBe(false)
    expect(isFinalFailure(job(5, 5))).toBe(true)
    expect(isFinalFailure(job(1))).toBe(true)
    expect(isFinalFailure(undefined)).toBe(true)
  })
})
