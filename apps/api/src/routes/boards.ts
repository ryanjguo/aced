import { asc, eq, schema } from '@aced/db'
import type { BoardList, Page, Post } from '@aced/types'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { HttpError } from '../errors.js'
import { listPosts, listQuery } from '../lib/post-list.js'
import { toBoard } from '../mappers/social.js'

const { posts, boards } = schema

export const boardRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/boards', async (): Promise<BoardList> => {
    const rows = await app.db.select().from(boards).orderBy(asc(boards.sortOrder))
    return { items: rows.map(toBoard) }
  })

  app.get(
    '/boards/:slug/posts',
    { schema: { params: z.object({ slug: z.string().max(100) }), querystring: listQuery } },
    async (req): Promise<Page<Post>> => {
      const [board] = await app.db.select().from(boards).where(eq(boards.slug, req.params.slug))
      if (!board) throw new HttpError(404, 'not_found', 'Board not found')
      return listPosts(app.db, {
        ...req.query,
        where: eq(posts.boardId, board.id),
        userId: req.user?.id,
      })
    },
  )
}
