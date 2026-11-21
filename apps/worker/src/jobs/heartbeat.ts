import type { JobDefinition } from '@aced/jobs'

export const heartbeat: JobDefinition = {
  name: 'heartbeat',
  repeat: { every: 15 * 60 * 1000 },
  handler: async () => {
    const time = new Date().toISOString()
    console.log(`[worker] heartbeat ${time}`)
    return { time }
  },
}
