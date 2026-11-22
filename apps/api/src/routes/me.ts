import { and, eq, schema, sql, type UserRow } from '@aced/db'
import type { Me } from '@aced/types'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { HttpError, isUniqueViolation } from '../errors.js'
import { assertClean } from '../moderation.js'
import { currentUser, requireUser, toUserSummary } from '../user.js'

const patchBody = z.object({
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,20}$/, '3–20 letters, numbers or underscores')
    .optional(),
  bio: z.string().trim().max(280).nullable().optional(),
})

function toMe(user: UserRow): Me {
  return { ...toUserSummary(user), bio: user.bio }
}

export const meRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/me', { preHandler: requireUser }, async (req): Promise<Me> => toMe(currentUser(req)))

  app.patch(
    '/me',
    { preHandler: requireUser, schema: { body: patchBody } },
    async (req): Promise<Me> => {
      const user = currentUser(req)
      if (Object.keys(req.body).length === 0) return toMe(user)
      assertClean(req.body.handle, req.body.bio)
      try {
        const [updated] = await app.db
          .update(schema.users)
          .set(req.body)
          .where(eq(schema.users.id, user.id))
          .returning()
        return toMe(updated ?? user)
      } catch (err) {
        if (isUniqueViolation(err)) throw new HttpError(409, 'handle_taken', 'Handle is taken')
        throw err
      }
    },
  )

  // GDPR-style export: everything tied to the account, as one JSON download.
  app.get('/me/export', { preHandler: requireUser }, async (req, reply) => {
    const user = currentUser(req)
    const { posts, comments, votes, follows } = schema
    const [myPosts, myComments, myVotes, myFollows] = await Promise.all([
      app.db
        .select({
          id: posts.id,
          kind: posts.kind,
          title: posts.title,
          body: posts.body,
          url: posts.url,
          createdAt: posts.createdAt,
        })
        .from(posts)
        .where(eq(posts.authorId, user.id)),
      app.db
        .select({
          id: comments.id,
          postId: comments.postId,
          body: comments.body,
          createdAt: comments.createdAt,
        })
        .from(comments)
        .where(eq(comments.authorId, user.id)),
      app.db
        .select({
          targetType: votes.targetType,
          targetId: votes.targetId,
          value: votes.value,
          createdAt: votes.createdAt,
        })
        .from(votes)
        .where(eq(votes.userId, user.id)),
      app.db
        .select({
          targetType: follows.targetType,
          targetId: follows.targetId,
          createdAt: follows.createdAt,
        })
        .from(follows)
        .where(eq(follows.userId, user.id)),
    ])
    reply.header('content-disposition', `attachment; filename="aced-${user.handle}.json"`)
    return {
      account: {
        handle: user.handle,
        name: user.name,
        email: user.email,
        bio: user.bio,
        createdAt: user.createdAt,
      },
      posts: myPosts,
      comments: myComments,
      votes: myVotes,
      follows: myFollows,
    }
  })

  // Deletes the account. Sessions, linked logins, votes, follows and reports cascade; posts and
  // comments stay with no author so threads still read. The typed handle guards against misclicks.
  app.delete(
    '/me',
    { preHandler: requireUser, schema: { body: z.object({ confirm: z.string() }) } },
    async (req, reply) => {
      const user = currentUser(req)
      if (req.body.confirm.trim().toLowerCase() !== user.handle) {
        throw new HttpError(400, 'bad_request', 'Type your handle to confirm')
      }
      await app.db.transaction(async (tx) => {
        // The votes are about to cascade away, so take them out of the cached scores first.
        for (const table of [schema.posts, schema.comments] as const) {
          const type = table === schema.posts ? 'post' : 'comment'
          await tx
            .update(table)
            .set({ score: sql`${table.score} - ${schema.votes.value}` })
            .from(schema.votes)
            .where(
              and(
                eq(schema.votes.userId, user.id),
                eq(schema.votes.targetType, type),
                eq(schema.votes.targetId, table.id),
              ),
            )
        }
        await tx.insert(schema.modActions).values({
          actorId: user.id,
          action: 'self_delete',
          targetType: 'user',
          targetId: user.id,
        })
        await tx.delete(schema.users).where(eq(schema.users.id, user.id))
      })
      return reply.code(204).send()
    },
  )
}
