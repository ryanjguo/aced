import type { Db } from '@aced/db'
import type { JobDefinition } from '@aced/jobs'
import { heartbeat } from './heartbeat.js'
import { hotScoresJob } from './hot-scores.js'
import { karmaJob } from './karma.js'
import { seriesCompletedJob } from './series-completed.js'

export function createJobs(db: Db): JobDefinition[] {
  return [heartbeat, hotScoresJob(db), karmaJob(db), seriesCompletedJob(db)]
}
