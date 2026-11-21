import { and, desc, eq, schema, sql } from '@aced/db'
import type { Page, Post, Profile, ProfileComment } from '@aced/types'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { HttpError } from '../errors.js'
import { decodeCursor, encodeCursor } from '../lib/cursor.js'
import { toComment, toPost } from '../mappers/social.js'
import { loadPostExtras } from '../post-extras.js'
import { rumorStats } from '../rumors.js'
import { toUserSummary } from '../user.js'
import { myVotes } from '../votes.js'

const { users, posts, comments, boards } = schema

const PAGE_SIZE = 25
const params = z.object({ handle: z.string().min(1).max(20) })
const pageQuery = z.object({ cursor: z.string().max(500).optional() })
// Newest first, keyed on (created_at as Postgres text, id) so microseconds survive the cursor.
const cursorKey = z.tuple([z.string(), z.uuid()])

export const userRoutes: FastifyPluginAsyncZod = async (app) => {
  async function findUser(handle: string) {
    const [user] = await app.db.select().from(users).where(eq(users.handle, handle))
    if (!user) throw new HttpError(404, 'not_found', 'User not found')
    return user
  }

  function decode(cursor: string | undefined) {
    const after = cursor ? decodeCursor(cursor, cursorKey) : undefined
    if (after === null) throw new HttpError(400, 'bad_request', 'Invalid cursor')
    return after
  }

  app.get('/users/:handle', { schema: { params } }, async (req): Promise<Profile> => {
    const user = await findUser(req.params.handle)
    return {
      ...toUserSummary(user),
      bio: user.bio,
      karma: user.karma,
      createdAt: user.createdAt.toISOString(),
      rumors: await rumorStats(app.db, user.id),
    }
  })

  app.get(
    '/users/:handle/posts',
    { schema: { params, querystring: pageQuery } },
    async (req): Promise<Page<Post>> => {
      const user = await findUser(req.params.handle)
      const after = decode(req.query.cursor)
      const rows = await app.db
        .select({ post: posts, board: boards, key: sql<string>`${posts.createdAt}::text` })
        .from(posts)
        .leftJoin(boards, eq(boards.id, posts.boardId))
        .where(
          and(
            eq(posts.authorId, user.id),
            eq(posts.isRemoved, false),
            after
              ? sql`(${posts.createdAt}, ${posts.id}) < (${after[0]}::timestamptz, ${after[1]})`
              : undefined,
          ),
        )
        .orderBy(desc(posts.createdAt), desc(posts.id))
        .limit(PAGE_SIZE + 1)
      const page = rows.slice(0, PAGE_SIZE)
      const extras = await loadPostExtras(
        app.db,
        req.user?.id,
        page.map((r) => r.post.id),
      )
      const last = page.at(-1)
      return {
        items: page.map((r) => toPost(r.post, user, r.board, extras(r.post.id))),
        nextCursor: rows.length > PAGE_SIZE && last ? encodeCursor([last.key, last.post.id]) : null,
      }
    },
  )

  app.get(
    '/users/:handle/comments',
    { schema: { params, querystring: pageQuery } },
    async (req): Promise<Page<ProfileComment>> => {
      const user = await findUser(req.params.handle)
      const after = decode(req.query.cursor)
      const rows = await app.db
        .select({
          comment: comments,
          postTitle: posts.title,
          key: sql<string>`${comments.createdAt}::text`,
        })
        .from(comments)
        .innerJoin(posts, eq(posts.id, comments.postId))
        .where(
          and(
            eq(comments.authorId, user.id),
            eq(comments.isRemoved, false),
            eq(posts.isRemoved, false),
            after
              ? sql`(${comments.createdAt}, ${comments.id}) < (${after[0]}::timestamptz, ${after[1]})`
              : undefined,
          ),
        )
        .orderBy(desc(comments.createdAt), desc(comments.id))
        .limit(PAGE_SIZE + 1)
      const page = rows.slice(0, PAGE_SIZE)
      const votes = await myVotes(
        app.db,
        req.user?.id,
        'comment',
        page.map((r) => r.comment.id),
      )
      const last = page.at(-1)
      return {
        items: page.map((r) => ({
          ...toComment(r.comment, user, 0, votes.get(r.comment.id)),
          post: { id: r.comment.postId, title: r.postTitle },
        })),
        nextCursor:
          rows.length > PAGE_SIZE && last ? encodeCursor([last.key, last.comment.id]) : null,
      }
    },
  )
}
