import { and, eq, schema, sql } from '@aced/db'
import type { VoteResult } from '@aced/types'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { HttpError } from '../errors.js'
import { rateLimit } from '../moderation.js'
import { currentUser, requireUser } from '../user.js'

const { votes, posts, comments } = schema

const voteBody = z.object({
  targetType: z.enum(['post', 'comment']),
  targetId: z.uuid(),
  value: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
})

export const voteRoutes: FastifyPluginAsyncZod = async (app) => {
  app.put(
    '/votes',
    { preHandler: requireUser, schema: { body: voteBody } },
    async (req): Promise<VoteResult> => {
      const user = currentUser(req)
      const userId = user.id
      await rateLimit(app, user, 'vote')
      const { targetType, targetId, value } = req.body
      const table = targetType === 'post' ? posts : comments

      return app.db.transaction(async (tx) => {
        // Locking the target serializes concurrent votes on it, keeping the cached score exact.
        const [target] = await tx
          .select({ isRemoved: table.isRemoved, authorId: table.authorId })
          .from(table)
          .where(eq(table.id, targetId))
          .for('update')
        if (!target) throw new HttpError(404, 'not_found', `${targetType} not found`)
        if (target.isRemoved) throw new HttpError(403, 'forbidden', "Can't vote on removed content")
        // Karma reflects what others think, so your own votes don't count.
        if (target.authorId === userId)
          throw new HttpError(403, 'forbidden', "Can't vote on your own content")

        const key = and(
          eq(votes.userId, userId),
          eq(votes.targetType, targetType),
          eq(votes.targetId, targetId),
        )
        const [existing] = await tx.select({ value: votes.value }).from(votes).where(key)
        const diff = value - (existing?.value ?? 0)

        if (value === 0) await tx.delete(votes).where(key)
        else {
          await tx
            .insert(votes)
            .values({ userId, targetType, targetId, value })
            .onConflictDoUpdate({
              target: [votes.userId, votes.targetType, votes.targetId],
              set: { value },
            })
        }
        const [updated] = await tx
          .update(table)
          .set({ score: sql`${table.score} + ${diff}` })
          .where(eq(table.id, targetId))
          .returning({ score: table.score })
        return { score: updated?.score ?? 0, myVote: value }
      })
    },
  )
}
