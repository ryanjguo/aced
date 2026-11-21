import { createDb, type Db } from '@aced/db'
import { createRedis, type Redis } from '@aced/redis'
import cors from '@fastify/cors'
import Fastify from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { registerErrorHandlers } from './errors.js'
import { healthRoutes } from './routes/health.js'

declare module 'fastify' {
  interface FastifyInstance {
    db: Db
    redis: Redis
  }
}

export interface AppOptions {
  databaseUrl: string
  redisUrl: string
  webOrigin: string
  logger?: boolean
}

export function buildApp(options: AppOptions) {
  const app = Fastify({ logger: options.logger ?? true }).withTypeProvider<ZodTypeProvider>()
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  const db = createDb(options.databaseUrl)
  const redis = createRedis(options.redisUrl)
  redis.on('error', (err) => app.log.warn({ err }, 'redis error'))
  app.decorate('db', db)
  app.decorate('redis', redis)
  app.addHook('onClose', async () => {
    redis.disconnect()
    await db.$client.end()
  })

  registerErrorHandlers(app)
  app.register(cors, { origin: options.webOrigin })
  app.register(healthRoutes)

  return app
}
