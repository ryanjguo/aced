import { pingDb } from '@aced/db'
import { pingRedis } from '@aced/redis'
import type { HealthResponse } from '@aced/types'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/health', async (_req, reply): Promise<HealthResponse> => {
    const [postgres, redis] = await Promise.all([pingDb(app.db), pingRedis(app.redis)])
    const ok = postgres && redis
    reply.code(ok ? 200 : 503)
    return {
      status: ok ? 'ok' : 'degraded',
      service: 'api',
      time: new Date().toISOString(),
      checks: { postgres, redis },
    }
  })
}
