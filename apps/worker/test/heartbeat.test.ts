import type { Job } from '@aced/jobs'
import { describe, expect, it } from 'vitest'
import { heartbeat } from '../src/jobs/heartbeat.js'

describe('heartbeat job', () => {
  it('repeats every 15 minutes and returns the time', async () => {
    expect(heartbeat.repeat).toEqual({ every: 15 * 60 * 1000 })
    const result = await heartbeat.handler({} as Job)
    expect(result).toEqual({ time: expect.any(String) })
  })
})
