import { eq, schema } from '@aced/db'
import { JOBS } from '@aced/jobs'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { HttpError } from '../errors.js'
import { currentUser, requireRole } from '../user.js'

const { series, posts, modActions } = schema

const seriesFix = z
  .object({
    scoreA: z.number().int().min(0).max(5),
    scoreB: z.number().int().min(0).max(5),
    status: z.enum(['scheduled', 'live', 'completed', 'cancelled']),
    winner: z.enum(['a', 'b']).nullable(),
    reason: z.string().trim().min(1).max(500),
  })
  .refine((b) => b.status === 'completed' || b.winner === null, {
    message: 'Only completed series have a winner',
  })

export const adminRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', requireRole('admin'))

  app.patch(
    '/admin/series/:id',
    { schema: { params: z.object({ id: z.uuid() }), body: seriesFix } },
    async (req, reply) => {
      const { scoreA, scoreB, status, winner, reason } = req.body
      const [row] = await app.db.select().from(series).where(eq(series.id, req.params.id))
      if (!row) throw new HttpError(404, 'not_found', 'Series not found')
      const winnerId = winner === 'a' ? row.teamAId : winner === 'b' ? row.teamBId : null

      await app.db.transaction(async (tx) => {
        await tx
          .update(series)
          .set({ scoreA, scoreB, status, winnerId, manualOverride: true })
          .where(eq(series.id, row.id))
        await tx.insert(modActions).values({
          actorId: currentUser(req).id,
          action: 'fix_series',
          targetType: 'series',
          targetId: row.id,
          reason,
        })
      })
      // Refresh the result card and match thread with the corrected score.
      if (status === 'completed') await app.jobs.enqueue(JOBS.seriesCompleted, { seriesId: row.id })
      return reply.code(204).send()
    },
  )

  app.post(
    '/admin/posts/:id/regenerate',
    { schema: { params: z.object({ id: z.uuid() }) } },
    async (req, reply) => {
      const [post] = await app.db.select().from(posts).where(eq(posts.id, req.params.id))
      if (!post) throw new HttpError(404, 'not_found', 'Post not found')
      const [kind, id, playerId] = post.sourceKey?.split(':') ?? []
      const job =
        (kind === 'result' || kind === 'match_thread') && id
          ? ([JOBS.seriesCompleted, { seriesId: id }] as const)
          : kind === 'stat_card' && id && playerId
            ? ([JOBS.mapCompleted, { mapId: id }] as const)
            : null
      if (!job) throw new HttpError(400, 'bad_request', "This post can't be regenerated")

      await app.db.transaction(async (tx) => {
        // Restore it if it was hidden, then let the worker rewrite it from current data.
        await tx.update(posts).set({ isRemoved: false }).where(eq(posts.id, post.id))
        await tx.insert(modActions).values({
          actorId: currentUser(req).id,
          action: 'regenerate_post',
          targetType: 'post',
          targetId: post.id,
        })
      })
      await app.jobs.enqueue(job[0], job[1])
      return reply.code(202).send()
    },
  )
}
