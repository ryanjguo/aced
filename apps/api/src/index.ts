import type { HealthResponse } from '@aced/types'
import Fastify from 'fastify'

const app = Fastify({ logger: true })

app.get(
  '/health',
  async (): Promise<HealthResponse> => ({
    status: 'ok',
    service: 'api',
    time: new Date().toISOString(),
  }),
)

const port = Number(process.env.PORT ?? 4000)

app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err)
  process.exit(1)
})
