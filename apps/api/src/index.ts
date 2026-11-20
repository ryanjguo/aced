import { createDb, pingDb } from '@aced/db'
import { createRedis, pingRedis } from '@aced/redis'
import type { HealthResponse } from '@aced/types'
import Fastify from 'fastify'
import { env } from './env.js'

const db = createDb(env.databaseUrl)
const redis = createRedis(env.redisUrl)

const app = Fastify({ logger: true })

redis.on('error', (err) => app.log.warn({ err }, 'redis error'))

app.get('/health', async (_req, reply): Promise<HealthResponse> => {
  const [postgres, redisOk] = await Promise.all([pingDb(db), pingRedis(redis)])
  const ok = postgres && redisOk
  reply.code(ok ? 200 : 503)
  return {
    status: ok ? 'ok' : 'degraded',
    service: 'api',
    time: new Date().toISOString(),
    checks: { postgres, redis: redisOk },
  }
})

app.listen({ port: env.port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err)
  process.exit(1)
})
