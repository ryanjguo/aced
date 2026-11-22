import { createDb, type Db } from '@aced/db'
import { createJobQueues, type JobQueues } from '@aced/jobs'
import { createQueueConnection, createRedis, type Redis } from '@aced/redis'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import Fastify from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { type Auth, type AuthOptions, createAuth } from './auth.js'
import { HttpError, registerErrorHandlers } from './errors.js'
import { adminRoutes } from './routes/admin.js'
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
import { sitemapRoutes } from './routes/sitemap.js'
import { testLoginRoutes } from './routes/test-login.js'
import { userRoutes } from './routes/users.js'
import { voteRoutes } from './routes/votes.js'
import { registerCurrentUser } from './user.js'

declare module 'fastify' {
  interface FastifyInstance {
    db: Db
    redis: Redis
    auth: Auth
    rateLimits: boolean
    jobs: JobQueues
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
  /** Registers POST /auth/test-login; never on in production. */
  testLogin?: boolean
  /**
   * Shared with the web server, whose page renders all come from its own IPs. Requests carrying it
   * skip the per-IP limit; without it set, per-IP limiting stays off so renders aren't throttled.
   */
  internalApiSecret?: string
}

export function buildApp(options: AppOptions) {
  const app = Fastify({
    logger: options.logger ?? true,
    // Idle keep-alive sockets would otherwise hold close() open until they time out.
    forceCloseConnections: 'idle',
    // One proxy hop (Railway's edge): the client IP is the address it saw, which can't be spoofed
    // by adding X-Forwarded-For entries.
    trustProxy: (_address, hop) => hop === 0,
    // Posts max out at 40k characters; this leaves room for JSON and tags.
    bodyLimit: 256 * 1024,
  }).withTypeProvider<ZodTypeProvider>()
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  const db = createDb(options.databaseUrl)
  const redis = createRedis(options.redisUrl)
  redis.on('error', (err) => app.log.warn({ err }, 'redis error'))
  app.decorate('db', db)
  app.decorate('redis', redis)
  app.decorate('rateLimits', options.rateLimits ?? true)
  const queueConnection = createQueueConnection(options.redisUrl)
  queueConnection.on('error', (err) => app.log.warn({ err }, 'queue redis error'))
  const jobs = createJobQueues(queueConnection)
  app.decorate('jobs', jobs)
  app.decorate('auth', createAuth(db, { ...options.auth, webOrigin: options.webOrigin }))
  app.addHook('onClose', async () => {
    redis.disconnect()
    await jobs.close()
    queueConnection.disconnect()
    await db.$client.end()
  })

  registerErrorHandlers(app)
  registerCurrentUser(app)
  // A JSON API serves no HTML, so a content security policy adds nothing here.
  app.register(helmet, { contentSecurityPolicy: false })
  const internal = options.internalApiSecret
  if ((options.rateLimits ?? true) && internal) {
    // Per-IP limit for all traffic, signed in or not; search and auth set stricter ones.
    app.register(rateLimit, {
      max: 300,
      timeWindow: '1 minute',
      redis,
      skipOnError: true,
      allowList: (req) => req.url === '/health' || req.headers['x-aced-internal'] === internal,
      errorResponseBuilder: (_req, ctx) =>
        new HttpError(429, 'rate_limited', 'Too many requests. Try again shortly.', {
          retryAfter: Math.ceil(ctx.ttl / 1000),
        }),
    })
  }
  app.register(cors, {
    origin: options.webOrigin,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  })
  app.register(healthRoutes)
  app.register(seriesRoutes)
  app.register(eventRoutes)
  if (options.testLogin) app.register(testLoginRoutes)
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
  app.register(adminRoutes)
  app.register(sitemapRoutes)

  return app
}
