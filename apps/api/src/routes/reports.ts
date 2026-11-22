import { and, countDistinct, eq, isNull, lt, or, schema, sql, type Tx } from '@aced/db'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { HttpError, isUniqueViolation } from '../errors.js'
import { NEW_ACCOUNT_MS, rateLimit } from '../moderation.js'
import { currentUser, requireUser } from '../user.js'

const { reports, posts, comments, users } = schema

// Content with this many open reports from different established users is hidden until a moderator
// reviews it. Reports from new or banned accounts still reach the queue but don't count here.
const AUTO_HIDE_REPORTS = 5

const reportBody = z.object({
  targetType: z.enum(['post', 'comment', 'user']),
  targetId: z.uuid(),
  reason: z.enum(['spam', 'harassment', 'misinformation', 'rumor_no_source', 'other']),
  note: z.string().trim().max(500).optional(),
})

export const reportRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/reports',
    { preHandler: requireUser, schema: { body: reportBody } },
    async (req, reply): Promise<{ id: string }> => {
      const reporter = currentUser(req)
      const reporterId = reporter.id
      const { targetType, targetId } = req.body
      const table = { post: posts, comment: comments, user: users }[targetType]
      const [target] = await app.db
        .select({ id: table.id })
        .from(table)
        .where(eq(table.id, targetId))
      if (!target) throw new HttpError(404, 'not_found', `${targetType} not found`)
      await rateLimit(app, reporter, 'report')

      const id = await app.db.transaction(async (tx) => {
        const [report] = await tx
          .insert(reports)
          .values({ ...req.body, reporterId })
          .returning({ id: reports.id })
          .catch((err: unknown) => {
            if (isUniqueViolation(err)) {
              throw new HttpError(409, 'already_reported', 'You already reported this')
            }
            throw err
          })
        if (targetType !== 'user') await autoHide(tx, targetType, targetId)
        return report?.id
      })
      if (!id) throw new Error('insert returned no row')
      reply.code(201)
      return { id }
    },
  )
}

async function autoHide(tx: Tx, targetType: 'post' | 'comment', targetId: string) {
  const [{ reporters } = { reporters: 0 }] = await tx
    .select({ reporters: countDistinct(reports.reporterId) })
    .from(reports)
    .innerJoin(users, eq(users.id, reports.reporterId))
    .where(
      and(
        eq(reports.targetType, targetType),
        eq(reports.targetId, targetId),
        eq(reports.status, 'open'),
        lt(users.createdAt, new Date(Date.now() - NEW_ACCOUNT_MS)),
        or(isNull(users.bannedUntil), lt(users.bannedUntil, new Date())),
      ),
    )
  if (reporters < AUTO_HIDE_REPORTS) return

  if (targetType === 'post') {
    await tx.update(posts).set({ isRemoved: true }).where(eq(posts.id, targetId))
    return
  }
  const [hidden] = await tx
    .update(comments)
    .set({ isRemoved: true })
    .where(and(eq(comments.id, targetId), eq(comments.isRemoved, false)))
    .returning({ postId: comments.postId })
  if (hidden) {
    await tx
      .update(posts)
      .set({ commentCount: sql`greatest(${posts.commentCount} - 1, 0)` })
      .where(eq(posts.id, hidden.postId))
  }
}
