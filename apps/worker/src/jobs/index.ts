import type { JobDefinition } from '@aced/jobs'
import { heartbeat } from './heartbeat.js'

export const jobs: JobDefinition[] = [heartbeat]
