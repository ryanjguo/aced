import { asc, eq, schema } from '@aced/db'
import type { EventDetail } from '@aced/types'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { toEvent } from '../mappers/esports.js'
import { loadSeries } from './series.js'

export const eventRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/events/:slug',
    { schema: { params: z.object({ slug: z.string().min(1).max(100) }) } },
    async (req, reply): Promise<EventDetail | undefined> => {
      const [event] = await app.db
        .select()
        .from(schema.events)
        .where(eq(schema.events.slug, req.params.slug))
      if (!event) {
        return reply.code(404).send({ error: { code: 'not_found', message: 'Event not found' } })
      }
      const rows = await app.db
        .select()
        .from(schema.series)
        .where(eq(schema.series.eventId, event.id))
        .orderBy(asc(schema.series.scheduledAt), asc(schema.series.id))
      return { event: toEvent(event), series: await loadSeries(app.db, rows) }
    },
  )
}
