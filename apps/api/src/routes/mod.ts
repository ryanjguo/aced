import { and, desc, eq, inArray, schema, sql, type Tx } from '@aced/db'
import type { ModQueueItem, Page, ReportReason } from '@aced/types'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { HttpError } from '../errors.js'
import { decodeCursor, encodeCursor } from '../lib/cursor.js'
import { currentUser, requireRole, toUserSummary } from '../user.js'

const { reports, posts, comments, users, modActions } = schema

const PAGE_SIZE = 25

const actionBody = z
  .object({
    action: z.enum(['remove', 'restore', 'lock', 'unlock', 'ban', 'unban', 'dismiss']),
    targetType: z.enum(['post', 'comment', 'user']),
    targetId: z.uuid(),
    reason: z.string().trim().min(1).max(500).optional(),
    until: z.coerce.date().optional(),
  })
  .refine(
    (b) =>
      ({
        remove: b.targetType !== 'user',
        restore: b.targetType !== 'user',
        lock: b.targetType === 'post',
        unlock: b.targetType === 'post',
        ban: b.targetType === 'user',
        unban: b.targetType === 'user',
        dismiss: true,
      })[b.action],
    { message: "That action doesn't apply to this target" },
  )
  .refine((b) => !['remove', 'ban'].includes(b.action) || b.reason, {
    message: 'A reason is required',
  })
  .refine((b) => b.action !== 'ban' || (b.until && b.until > new Date()), {
    message: 'Bans need a future `until`',
  })

/** Hides or shows a comment, keeping its post's comment_count in step. */
async function setCommentRemoved(tx: Tx, id: string, isRemoved: boolean) {
  const [changed] = await tx
    .update(comments)
    .set({ isRemoved })
    .where(and(eq(comments.id, id), eq(comments.isRemoved, !isRemoved)))
    .returning({ postId: comments.postId })
  if (!changed) return
  await tx
    .update(posts)
    .set({
      commentCount: isRemoved
        ? sql`greatest(${posts.commentCount} - 1, 0)`
        : sql`${posts.commentCount} + 1`,
    })
    .where(eq(posts.id, changed.postId))
}

export const modRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', requireRole('moderator'))

  app.get(
    '/mod/reports',
    { schema: { querystring: z.object({ cursor: z.string().max(500).optional() }) } },
    async (req): Promise<Page<ModQueueItem>> => {
      const after = req.query.cursor
        ? decodeCursor(req.query.cursor, z.tuple([z.string(), z.uuid()]))
        : undefined
      if (after === null) throw new HttpError(400, 'bad_request', 'Invalid cursor')

      const last = sql<string>`max(${reports.createdAt})`
      const groups = await app.db
        .select({
          targetType: reports.targetType,
          targetId: reports.targetId,
          reportCount: sql<number>`count(*)::int`,
          reasons: sql<ReportReason[]>`array_agg(distinct ${reports.reason})`,
          notes: sql<string[]>`array_remove(array_agg(${reports.note}), null)`,
          lastReportedAt: sql<string>`${last}::text`,
        })
        .from(reports)
        .where(eq(reports.status, 'open'))
        .groupBy(reports.targetType, reports.targetId)
        .having(
          after
            ? sql`(${last}, ${reports.targetId}) < (${after[0]}::timestamptz, ${after[1]})`
            : undefined,
        )
        .orderBy(desc(last), desc(reports.targetId))
        .limit(PAGE_SIZE + 1)

      const page = groups.slice(0, PAGE_SIZE)
      const ids = (type: string) => page.filter((g) => g.targetType === type).map((g) => g.targetId)
      const [postRows, commentRows, userRows] = await Promise.all([
        ids('post').length
          ? app.db
              .select({ post: posts, author: users })
              .from(posts)
              .leftJoin(users, eq(users.id, posts.authorId))
              .where(inArray(posts.id, ids('post')))
          : [],
        ids('comment').length
          ? app.db
              .select({ comment: comments, author: users })
              .from(comments)
              .leftJoin(users, eq(users.id, comments.authorId))
              .where(inArray(comments.id, ids('comment')))
          : [],
        ids('user').length
          ? app.db
              .select()
              .from(users)
              .where(inArray(users.id, ids('user')))
          : [],
      ])

      const preview = (g: (typeof page)[number]): ModQueueItem['preview'] => {
        if (g.targetType === 'post') {
          const r = postRows.find((p) => p.post.id === g.targetId)
          return r
            ? {
                title: r.post.title,
                body: r.post.url ? `${r.post.url}\n\n${r.post.body}` : r.post.body,
                author: r.author && toUserSummary(r.author),
                postId: r.post.id,
                isRemoved: r.post.isRemoved,
                isLocked: r.post.isLocked,
              }
            : null
        }
        if (g.targetType === 'comment') {
          const r = commentRows.find((c) => c.comment.id === g.targetId)
          return r
            ? {
                title: null,
                body: r.comment.body,
                author: r.author && toUserSummary(r.author),
                postId: r.comment.postId,
                isRemoved: r.comment.isRemoved,
                isLocked: false,
              }
            : null
        }
        const u = userRows.find((u) => u.id === g.targetId)
        return u
          ? {
              title: `@${u.handle}`,
              body: u.bio ?? '',
              author: toUserSummary(u),
              postId: null,
              isRemoved: false,
              isLocked: false,
            }
          : null
      }

      const lastGroup = page.at(-1)
      return {
        items: page.map((g) => ({
          targetType: g.targetType,
          targetId: g.targetId,
          reportCount: g.reportCount,
          reasons: g.reasons,
          notes: g.notes,
          lastReportedAt: new Date(g.lastReportedAt).toISOString(),
          preview: preview(g),
        })),
        nextCursor:
          groups.length > PAGE_SIZE && lastGroup
            ? encodeCursor([lastGroup.lastReportedAt, lastGroup.targetId])
            : null,
      }
    },
  )

  app.post(
    '/mod/actions',
    { schema: { body: actionBody } },
    async (req, reply): Promise<{ id: string }> => {
      const { action, targetType, targetId, reason, until } = req.body
      const actorId = currentUser(req).id

      const id = await app.db.transaction(async (tx) => {
        const table = { post: posts, comment: comments, user: users }[targetType]
        const [target] = await tx.select({ id: table.id }).from(table).where(eq(table.id, targetId))
        if (!target) throw new HttpError(404, 'not_found', `${targetType} not found`)

        if (action === 'remove' || action === 'restore') {
          const isRemoved = action === 'remove'
          if (targetType === 'post') {
            await tx.update(posts).set({ isRemoved }).where(eq(posts.id, targetId))
          } else await setCommentRemoved(tx, targetId, isRemoved)
        }
        if (action === 'lock' || action === 'unlock') {
          await tx
            .update(posts)
            .set({ isLocked: action === 'lock' })
            .where(eq(posts.id, targetId))
        }
        if (action === 'ban' || action === 'unban') {
          await tx
            .update(users)
            .set({ bannedUntil: action === 'ban' ? until : null })
            .where(eq(users.id, targetId))
        }

        // Acting on a target closes its open reports; restoring or dismissing means they were wrong.
        const status = {
          remove: 'actioned',
          lock: 'actioned',
          ban: 'actioned',
          restore: 'dismissed',
          dismiss: 'dismissed',
        } as const
        const closeAs = status[action as keyof typeof status]
        if (closeAs) {
          await tx
            .update(reports)
            .set({ status: closeAs })
            .where(
              and(
                eq(reports.targetType, targetType),
                eq(reports.targetId, targetId),
                eq(reports.status, 'open'),
              ),
            )
        }

        const [logged] = await tx
          .insert(modActions)
          .values({ actorId, action, targetType, targetId, reason })
          .returning({ id: modActions.id })
        return logged?.id
      })
      if (!id) throw new Error('insert returned no row')
      reply.code(201)
      return { id }
    },
  )
}
