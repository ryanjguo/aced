import { once } from 'node:events'
import { buildApp } from '../src/app.js'
import { env } from '../src/env.js'

export function buildTestApp() {
  return buildApp({ ...env, logger: false })
}

export async function redisReady(app: ReturnType<typeof buildApp>) {
  if (app.redis.status !== 'ready') await once(app.redis, 'ready')
}
