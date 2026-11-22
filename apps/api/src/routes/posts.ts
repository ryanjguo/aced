import { eq, type PostRow, schema } from '@aced/db'
import { hotScore } from '@aced/ranking'
import type { Post } from '@aced/types'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { HttpError } from '../errors.js'
import { toPost } from '../mappers/social.js'
import { currentUser, requireUser } from '../user.js'
import { myVotes } from '../votes.js'

const { posts, users, boards } = schema

const title = z.string().trim().min(1).max(300)
const body = z.string().trim().max(40_000)
const takeBody = z.string().trim().min(1).max(500)

// Users can create only these kinds; the rest are system-generated.
const createBody = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('thread'), boardId: z.uuid(), title, body: body.default('') }),
  z.object({
    kind: z.literal('link'),
    boardId: z.uuid(),
    title,
    url: z.url({ protocol: /^https?$/ }).max(2000),
    body: body.default(''),
  }),
  z.object({ kind: z.literal('take'), body: takeBody, boardId: z.uuid().optional() }),
])

const updateBody = z.object({ title: title.optional(), body: body.optional() })
const idParams = z.object({ id: z.uuid() })

export const postRoutes: FastifyPluginAsyncZod = async (app) => {
  async function loadPost(id: string, userId: string | undefined): Promise<Post> {
    const [row] = await app.db
      .select({ post: posts, author: users, board: boards })
      .from(posts)
      .leftJoin(users, eq(users.id, posts.authorId))
      .leftJoin(boards, eq(boards.id, posts.boardId))
      .where(eq(posts.id, id))
    if (!row) throw new HttpError(404, 'not_found', 'Post not found')
    const votes = await myVotes(app.db, userId, 'post', [id])
    return toPost(row.post, row.author, row.board, votes.get(id))
  }

  async function ownPost(id: string, userId: string): Promise<PostRow> {
    const [row] = await app.db.select().from(posts).where(eq(posts.id, id))
    if (!row || row.isRemoved) throw new HttpError(404, 'not_found', 'Post not found')
    if (row.authorId !== userId) throw new HttpError(403, 'forbidden', 'Not your post')
    return row
  }

  app.post(
    '/posts',
    { preHandler: requireUser, schema: { body: createBody } },
    async (req, reply): Promise<Post> => {
      const user = currentUser(req)
      const input = req.body
      if (input.boardId) {
        const [board] = await app.db.select().from(boards).where(eq(boards.id, input.boardId))
        if (!board) throw new HttpError(400, 'bad_request', 'Unknown board')
      }
      // #54: content filter and rate limits run here, before the insert.
      const createdAt = new Date()
      const [row] = await app.db
        .insert(posts)
        .values({ ...input, authorId: user.id, createdAt, hotScore: hotScore(0, createdAt) })
        .returning({ id: posts.id })
      if (!row) throw new Error('insert returned no row')
      reply.code(201)
      return loadPost(row.id, user.id)
    },
  )

  app.get('/posts/:id', { schema: { params: idParams } }, (req) =>
    loadPost(req.params.id, req.user?.id),
  )

  app.patch(
    '/posts/:id',
    { preHandler: requireUser, schema: { params: idParams, body: updateBody } },
    async (req): Promise<Post> => {
      const post = await ownPost(req.params.id, currentUser(req).id)
      const { title, body } = req.body
      if (post.kind === 'take') {
        if (title !== undefined) throw new HttpError(400, 'bad_request', 'Takes have no title')
        if (body !== undefined && !takeBody.safeParse(body).success) {
          throw new HttpError(400, 'bad_request', 'Takes are 1–500 characters')
        }
      }
      if (title === undefined && body === undefined)
        return loadPost(post.id, post.authorId ?? undefined)
      // #54: content filter runs here too.
      await app.db
        .update(posts)
        .set({ title, body, editedAt: new Date() })
        .where(eq(posts.id, post.id))
      return loadPost(post.id, post.authorId ?? undefined)
    },
  )

  app.delete(
    '/posts/:id',
    { preHandler: requireUser, schema: { params: idParams } },
    async (req, reply) => {
      const post = await ownPost(req.params.id, currentUser(req).id)
      await app.db.update(posts).set({ isRemoved: true }).where(eq(posts.id, post.id))
      return reply.code(204).send()
    },
  )
}
