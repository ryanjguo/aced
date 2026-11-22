import { and, asc, type CommentRow, desc, eq, inArray, schema, sql, type UserRow } from '@aced/db'
import type { CommentNode, Page } from '@aced/types'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { HttpError } from '../errors.js'
import { decodeCursor, encodeCursor } from '../lib/cursor.js'
import { toComment } from '../mappers/social.js'
import { assertClean, rateLimit } from '../moderation.js'
import { currentUser, requireUser } from '../user.js'
import { myVotes } from '../votes.js'

const { comments, posts, users } = schema

const PAGE_SIZE = 25
const MAX_DEPTH = 6
// Replies loaded under one page; deeper threads load via /comments/:id/replies.
const MAX_REPLIES = 500

const commentBody = z.string().trim().min(1).max(10_000)
const idParams = z.object({ id: z.uuid() })

const selectComment = { comment: comments, author: users }

export const commentRoutes: FastifyPluginAsyncZod = async (app) => {
  /** Loads replies under `roots` level by level (at most MAX_DEPTH queries) and nests them. */
  async function withReplies(
    roots: { comment: CommentRow; author: UserRow | null }[],
    userId: string | undefined,
  ): Promise<CommentNode[]> {
    const all = [...roots]
    let frontier = roots.map((r) => r.comment.id)
    while (frontier.length && all.length - roots.length < MAX_REPLIES) {
      const rows = await app.db
        .select(selectComment)
        .from(comments)
        .leftJoin(users, eq(users.id, comments.authorId))
        .where(inArray(comments.parentId, frontier))
        .orderBy(desc(comments.score), asc(comments.createdAt))
        .limit(MAX_REPLIES - (all.length - roots.length))
      all.push(...rows)
      frontier = rows.map((r) => r.comment.id)
    }

    const counts = all.length
      ? await app.db
          .select({ parentId: comments.parentId, count: sql<number>`count(*)::int` })
          .from(comments)
          .where(
            inArray(
              comments.parentId,
              all.map((r) => r.comment.id),
            ),
          )
          .groupBy(comments.parentId)
      : []
    const replyCount = new Map(counts.map((c) => [c.parentId, c.count]))
    const votes = await myVotes(
      app.db,
      userId,
      'comment',
      all.map((r) => r.comment.id),
    )

    const nodes = new Map<string, CommentNode>()
    for (const r of all) {
      nodes.set(r.comment.id, {
        ...toComment(
          r.comment,
          r.author,
          replyCount.get(r.comment.id) ?? 0,
          votes.get(r.comment.id),
        ),
        replies: [],
      })
    }
    for (const r of all.slice(roots.length)) {
      const parent = r.comment.parentId ? nodes.get(r.comment.parentId) : undefined
      const node = nodes.get(r.comment.id)
      if (parent && node) parent.replies.push(node)
    }
    return roots.map((r) => nodes.get(r.comment.id)).filter((n) => n !== undefined)
  }

  async function ownComment(id: string, userId: string) {
    const [row] = await app.db.select().from(comments).where(eq(comments.id, id))
    if (!row || row.isRemoved) throw new HttpError(404, 'not_found', 'Comment not found')
    if (row.authorId !== userId) throw new HttpError(403, 'forbidden', 'Not your comment')
    return row
  }

  app.get(
    '/posts/:id/comments',
    {
      schema: {
        params: idParams,
        querystring: z.object({ cursor: z.string().max(500).optional() }),
      },
    },
    async (req): Promise<Page<CommentNode>> => {
      const { cursor } = req.query
      const after = cursor ? decodeCursor(cursor, z.tuple([z.number(), z.uuid()])) : undefined
      if (after === null) throw new HttpError(400, 'bad_request', 'Invalid cursor')

      const roots = await app.db
        .select(selectComment)
        .from(comments)
        .leftJoin(users, eq(users.id, comments.authorId))
        .where(
          and(
            eq(comments.postId, req.params.id),
            sql`${comments.parentId} is null`,
            after
              ? sql`(${comments.score}, ${comments.id}) < (${after[0]}, ${after[1]})`
              : undefined,
          ),
        )
        .orderBy(desc(comments.score), desc(comments.id))
        .limit(PAGE_SIZE + 1)

      const page = roots.slice(0, PAGE_SIZE)
      const last = page.at(-1)?.comment
      return {
        items: await withReplies(page, req.user?.id),
        nextCursor: roots.length > PAGE_SIZE && last ? encodeCursor([last.score, last.id]) : null,
      }
    },
  )

  app.get(
    '/comments/:id/replies',
    { schema: { params: idParams } },
    async (req): Promise<{ items: CommentNode[] }> => {
      const [root] = await app.db
        .select(selectComment)
        .from(comments)
        .leftJoin(users, eq(users.id, comments.authorId))
        .where(eq(comments.id, req.params.id))
      if (!root) throw new HttpError(404, 'not_found', 'Comment not found')
      const [node] = await withReplies([root], req.user?.id)
      return { items: node?.replies ?? [] }
    },
  )

  app.post(
    '/posts/:id/comments',
    {
      preHandler: requireUser,
      schema: {
        params: idParams,
        body: z.object({ body: commentBody, parentId: z.uuid().optional() }),
      },
    },
    async (req, reply): Promise<CommentNode> => {
      const user = currentUser(req)
      const [post] = await app.db.select().from(posts).where(eq(posts.id, req.params.id))
      if (!post || post.isRemoved) throw new HttpError(404, 'not_found', 'Post not found')
      if (post.isLocked) throw new HttpError(403, 'locked', 'This post is locked')

      let depth = 0
      if (req.body.parentId) {
        const [parent] = await app.db
          .select()
          .from(comments)
          .where(and(eq(comments.id, req.body.parentId), eq(comments.postId, post.id)))
        if (!parent) throw new HttpError(400, 'bad_request', 'Parent comment not found')
        depth = parent.depth + 1
        if (depth > MAX_DEPTH) throw new HttpError(400, 'bad_request', 'Thread is too deep')
      }

      assertClean(req.body.body)
      await rateLimit(app, user, 'comment')
      const row = await app.db.transaction(async (tx) => {
        const [created] = await tx
          .insert(comments)
          .values({
            postId: post.id,
            parentId: req.body.parentId,
            authorId: user.id,
            body: req.body.body,
            depth,
          })
          .returning()
        await tx
          .update(posts)
          .set({ commentCount: sql`${posts.commentCount} + 1` })
          .where(eq(posts.id, post.id))
        return created
      })
      if (!row) throw new Error('insert returned no row')
      reply.code(201)
      return { ...toComment(row, user, 0), replies: [] }
    },
  )

  app.patch(
    '/comments/:id',
    {
      preHandler: requireUser,
      schema: { params: idParams, body: z.object({ body: commentBody }) },
    },
    async (req): Promise<CommentNode> => {
      const user = currentUser(req)
      const comment = await ownComment(req.params.id, user.id)
      assertClean(req.body.body)
      const [row] = await app.db
        .update(comments)
        .set({ body: req.body.body, editedAt: new Date() })
        .where(eq(comments.id, comment.id))
        .returning()
      if (!row) throw new Error('update returned no row')
      const [node] = await withReplies([{ comment: row, author: user }], user.id)
      if (!node) throw new Error('unreachable')
      return node
    },
  )

  app.delete(
    '/comments/:id',
    { preHandler: requireUser, schema: { params: idParams } },
    async (req, reply) => {
      const comment = await ownComment(req.params.id, currentUser(req).id)
      await app.db.transaction(async (tx) => {
        await tx.update(comments).set({ isRemoved: true }).where(eq(comments.id, comment.id))
        await tx
          .update(posts)
          .set({ commentCount: sql`greatest(${posts.commentCount} - 1, 0)` })
          .where(eq(posts.id, comment.postId))
      })
      return reply.code(204).send()
    },
  )
}
