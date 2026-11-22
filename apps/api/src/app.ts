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
import { boardRoutes } from './routes/boards.js'
import { commentRoutes } from './routes/comments.js'
import { entityRoutes } from './routes/entities.js'
import { eventRoutes } from './routes/events.js'
import { feedRoutes } from './routes/feeds.js'
import { followRoutes } from './routes/follows.js'
import { healthRoutes } from './routes/health.js'
import { meRoutes } from './routes/me.js'
import { modRoutes } from './routes/mod.js'
import { postRoutes } from './routes/posts.js'
import { reportRoutes } from './routes/reports.js'
import { searchRoutes } from './routes/search.js'
import { seriesRoutes } from './routes/series.js'
import { userRoutes } from './routes/users.js'
import { voteRoutes } from './routes/votes.js'
import { registerCurrentUser } from './user.js'

declare module 'fastify' {
  interface FastifyInstance {
    db: Db
    redis: Redis
    auth: Auth
    rateLimits: boolean
  }
}

export interface AppOptions {
  databaseUrl: string
  redisUrl: string
  webOrigin: string
  auth: Omit<AuthOptions, 'webOrigin'>
  logger?: boolean
  /** Off in most tests, which write faster than real users. */
  rateLimits?: boolean
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
  app.decorate('rateLimits', options.rateLimits ?? true)
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
  app.register(seriesRoutes)
  app.register(eventRoutes)
  app.register(authRoutes)
  app.register(meRoutes)
  app.register(entityRoutes)
  app.register(boardRoutes)
  app.register(postRoutes)
  app.register(commentRoutes)
  app.register(voteRoutes)
  app.register(reportRoutes)
  app.register(modRoutes)
  app.register(userRoutes)
  app.register(searchRoutes)
  app.register(followRoutes)
  app.register(feedRoutes)

  return app
}
