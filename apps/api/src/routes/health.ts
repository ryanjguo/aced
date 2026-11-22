import { pingDb } from '@aced/db'
import { WORKER_LAST_SYNC_KEY } from '@aced/jobs'
import { pingRedis } from '@aced/redis'
import type { HealthResponse } from '@aced/types'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

const STALE_MS = 30 * 60 * 1000

/** Whether the last sync is recent; null when no sync has ever run. */
export function workerFresh(lastSyncOk: string | null, now = Date.now()): boolean | null {
  if (!lastSyncOk) return null
  const at = Date.parse(lastSyncOk)
  return !Number.isNaN(at) && now - at < STALE_MS
}

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/health', async (_req, reply): Promise<HealthResponse> => {
    const [postgres, redis] = await Promise.all([pingDb(app.db), pingRedis(app.redis)])
    const lastSync = redis ? await app.redis.get(WORKER_LAST_SYNC_KEY).catch(() => null) : null
    const worker = workerFresh(lastSync)
    // A stale worker degrades the status, but only the API's own dependencies fail the check.
    reply.code(postgres && redis ? 200 : 503)
    return {
      status: postgres && redis && worker !== false ? 'ok' : 'degraded',
      service: 'api',
      time: new Date().toISOString(),
      checks: { postgres, redis, worker },
    }
  })
}
