import { createDb, type Db } from '@aced/db'
import { createRedis, type Redis } from '@aced/redis'
import cors from '@fastify/cors'
import Fastify from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { type Auth, type AuthOptions, createAuth } from './auth.js'
import { registerErrorHandlers } from './errors.js'
import { authRoutes } from './routes/auth.js'
import { healthRoutes } from './routes/health.js'
import { meRoutes } from './routes/me.js'
import { registerCurrentUser } from './user.js'

declare module 'fastify' {
  interface FastifyInstance {
    db: Db
    redis: Redis
    auth: Auth
  }
}

export interface AppOptions {
  databaseUrl: string
  redisUrl: string
  webOrigin: string
  auth: Omit<AuthOptions, 'webOrigin'>
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
  app.decorate('auth', createAuth(db, { ...options.auth, webOrigin: options.webOrigin }))
  app.addHook('onClose', async () => {
    redis.disconnect()
    await db.$client.end()
  })

  registerErrorHandlers(app)
  registerCurrentUser(app)
  app.register(cors, {
    origin: options.webOrigin,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  })
  app.register(healthRoutes)
  app.register(authRoutes)
  app.register(meRoutes)

  return app
}
