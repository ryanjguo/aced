import { createJobQueues } from '@aced/jobs'
import { createQueueConnection } from '@aced/redis'
import { Worker } from 'bullmq'
import { env } from './env.js'
import { jobs } from './jobs/index.js'

const connection = createQueueConnection(env.redisUrl)
const queues = createJobQueues(connection)

const workers = jobs.map((job) => {
  const worker = new Worker(job.name, job.handler, { connection })
  worker.on('failed', (j, err) => console.error(`[worker] ${job.name} failed`, j?.id, err))
  return worker
})

for (const job of jobs) {
  if (job.repeat) await queues.queue(job.name).upsertJobScheduler(job.name, job.repeat)
}
console.log(`[worker] running ${jobs.map((j) => j.name).join(', ')}`)

// Railway sends SIGTERM on redeploy; let running jobs finish before exiting.
async function shutdown(signal: string) {
  console.log(`[worker] ${signal}, shutting down`)
  await Promise.all(workers.map((w) => w.close()))
  await queues.close()
  connection.disconnect()
  process.exit(0)
}
process.once('SIGTERM', () => void shutdown('SIGTERM'))
process.once('SIGINT', () => void shutdown('SIGINT'))
