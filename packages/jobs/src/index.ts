import type { Redis } from '@aced/redis'
import { type Job, Queue, type RepeatOptions } from 'bullmq'

export type { Job }

/** Names of jobs other apps enqueue; the worker registers handlers under these. */
export const JOBS = {
  seriesCompleted: 'series-completed',
  mapCompleted: 'map-completed',
  rosterChanged: 'roster-changed',
} as const

/** ISO time of the last successful GRID sync; written by the sync job, read by API /health. */
export const WORKER_LAST_SYNC_KEY = 'worker:last_sync_ok'

/** A job module in `apps/worker/src/jobs`. Each job name is also its queue name. */
export interface JobDefinition<Data = unknown> {
  name: string
  // Method syntax so typed jobs fit in a JobDefinition[] list.
  handler(job: Job<Data>): Promise<unknown>
  repeat?: Pick<RepeatOptions, 'every' | 'pattern'>
}

/** Enqueues one-off jobs from any app. Reuses one Queue per job name. */
export function createJobQueues(connection: Redis) {
  const queues = new Map<string, Queue>()
  const queue = (name: string) => {
    let q = queues.get(name)
    if (!q) {
      q = new Queue(name, { connection })
      queues.set(name, q)
    }
    return q
  }

  return {
    queue,
    enqueue: (name: string, data: unknown = {}) =>
      queue(name).add(name, data, { removeOnComplete: 1000, removeOnFail: 5000 }),
    close: () => Promise.all([...queues.values()].map((q) => q.close())),
  }
}

export type JobQueues = ReturnType<typeof createJobQueues>
