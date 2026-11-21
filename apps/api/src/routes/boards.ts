import { and, asc, desc, eq, gte, schema, sql } from '@aced/db'
import type { BoardList, Page, Post } from '@aced/types'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { decodeCursor, encodeCursor } from '../lib/cursor.js'
import { toBoard, toPost } from '../mappers/social.js'
import { myVotes } from '../votes.js'

const PAGE_SIZE = 25
const DAY = 24 * 60 * 60 * 1000

const { posts, users, boards } = schema

// Each sort keys on (value, id) so ties page deterministically.
const sorts = {
  hot: { column: posts.hotScore, value: z.number() },
  top: { column: posts.score, value: z.number() },
  // Postgres text keeps microseconds that a JS Date would drop.
  new: { column: posts.createdAt, value: z.string() },
}

const listQuery = z.object({
  sort: z.enum(['hot', 'new', 'top']).default('hot'),
  t: z.enum(['day', 'week', 'all']).default('week'),
  cursor: z.string().max(500).optional(),
})

export const boardRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/boards', async (): Promise<BoardList> => {
    const rows = await app.db.select().from(boards).orderBy(asc(boards.sortOrder))
    return { items: rows.map(toBoard) }
  })

  app.get(
    '/boards/:slug/posts',
    { schema: { params: z.object({ slug: z.string().max(100) }), querystring: listQuery } },
    async (req, reply): Promise<Page<Post> | undefined> => {
      const { sort, t, cursor } = req.query
      const [board] = await app.db.select().from(boards).where(eq(boards.slug, req.params.slug))
      if (!board) {
        return reply.code(404).send({ error: { code: 'not_found', message: 'Board not found' } })
      }

      const { column, value } = sorts[sort]
      const after = cursor ? decodeCursor(cursor, z.tuple([value, z.uuid()])) : undefined
      if (after === null) {
        return reply.code(400).send({ error: { code: 'bad_request', message: 'Invalid cursor' } })
      }
      const keyText = sort === 'new' ? sql<string>`${posts.createdAt}::text` : column

      const rows = await app.db
        .select({ post: posts, author: users, key: keyText })
        .from(posts)
        .leftJoin(users, eq(users.id, posts.authorId))
        .where(
          and(
            eq(posts.boardId, board.id),
            eq(posts.isRemoved, false),
            sort === 'top' && t !== 'all'
              ? gte(posts.createdAt, new Date(Date.now() - (t === 'day' ? 1 : 7) * DAY))
              : undefined,
            after
              ? sql`(${column}, ${posts.id}) < (${sort === 'new' ? sql`${after[0]}::timestamptz` : after[0]}, ${after[1]})`
              : undefined,
          ),
        )
        .orderBy(desc(column), desc(posts.id))
        .limit(PAGE_SIZE + 1)

      const page = rows.slice(0, PAGE_SIZE)
      const last = page.at(-1)
      const votes = await myVotes(
        app.db,
        req.user?.id,
        'post',
        page.map((r) => r.post.id),
      )
      return {
        items: page.map((r) => toPost(r.post, r.author, board, votes.get(r.post.id))),
        nextCursor: rows.length > PAGE_SIZE && last ? encodeCursor([last.key, last.post.id]) : null,
      }
    },
  )
}
