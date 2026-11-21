import type { Db } from '@aced/db'
import type { JobDefinition } from '@aced/jobs'
import { heartbeat } from './heartbeat.js'
import { hotScoresJob } from './hot-scores.js'

export function createJobs(db: Db): JobDefinition[] {
  return [heartbeat, hotScoresJob(db)]
}
