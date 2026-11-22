import * as Sentry from '@sentry/node'
import { buildApp } from './app.js'
import { env } from './env.js'

// Off unless SENTRY_DSN is set.
if (env.sentryDsn) Sentry.init({ dsn: env.sentryDsn })

const app = buildApp(env)

app.listen({ port: env.port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err)
  process.exit(1)
})

// Railway sends SIGTERM on redeploy: finish in-flight requests, close DB and Redis, then exit.
async function shutdown(signal: string) {
  app.log.info(`${signal}, shutting down`)
  setTimeout(() => process.exit(1), 10_000).unref()
  await app.close()
  process.exit(0)
}
process.once('SIGTERM', () => void shutdown('SIGTERM'))
process.once('SIGINT', () => void shutdown('SIGINT'))
