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
