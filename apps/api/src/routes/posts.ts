import { and, eq, type PostRow, schema, sql } from '@aced/db'
import { hotScore } from '@aced/ranking'
import type { Page, Post } from '@aced/types'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { HttpError } from '../errors.js'
import { listPosts, listQuery } from '../lib/post-list.js'
import { toPost } from '../mappers/social.js'
import { assertClean, rateLimit } from '../moderation.js'
import { loadPostExtras } from '../post-extras.js'
import { saveTags, tagsInput } from '../tags.js'
import { currentUser, requireUser } from '../user.js'

const { posts, users, boards } = schema

const title = z.string().trim().min(1).max(300)
const body = z.string().trim().max(40_000)
const takeBody = z.string().trim().min(1).max(500)

// Users can create only these kinds; the rest are system-generated.
const createBody = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('thread'),
    boardId: z.uuid(),
    title,
    body: body.default(''),
    tags: tagsInput.default([]),
  }),
  z.object({
    kind: z.literal('link'),
    boardId: z.uuid(),
    title,
    url: z.url({ protocol: /^https?$/ }).max(2000),
    body: body.default(''),
    tags: tagsInput.default([]),
  }),
  z.object({
    kind: z.literal('take'),
    body: takeBody,
    boardId: z.uuid().optional(),
    tags: tagsInput.default([]),
  }),
])

const updateBody = z.object({
  title: title.optional(),
  body: body.optional(),
  tags: tagsInput.optional(),
})
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
    const extras = await loadPostExtras(app.db, userId, [id])
    return toPost(row.post, row.author, row.board, extras(id))
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
      assertClean(
        input.body,
        'title' in input ? input.title : null,
        'url' in input ? input.url : null,
      )
      await rateLimit(app, user, 'post')
      const createdAt = new Date()
      const { tags, ...values } = input
      const row = await app.db.transaction(async (tx) => {
        const [created] = await tx
          .insert(posts)
          .values({ ...values, authorId: user.id, createdAt, hotScore: hotScore(0, createdAt) })
          .returning({ id: posts.id })
        if (!created) throw new Error('insert returned no row')
        await saveTags(tx, created.id, tags)
        return created
      })
      reply.code(201)
      return loadPost(row.id, user.id)
    },
  )

  app.get(
    '/posts',
    {
      schema: {
        querystring: listQuery.extend({
          entityType: z.enum(['player', 'team', 'event']),
          entityId: z.uuid(),
        }),
      },
    },
    async (req): Promise<Page<Post>> => {
      const { entityType, entityId, ...query } = req.query
      const { postTags } = schema
      const tagged = sql`exists (select 1 from ${postTags} where ${and(
        eq(postTags.postId, posts.id),
        eq(postTags.entityType, entityType),
        eq(postTags.entityId, entityId),
      )})`
      return listPosts(app.db, { ...query, where: tagged, userId: req.user?.id })
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
      const { title, body, tags } = req.body
      if (post.kind === 'take') {
        if (title !== undefined) throw new HttpError(400, 'bad_request', 'Takes have no title')
        if (body !== undefined && !takeBody.safeParse(body).success) {
          throw new HttpError(400, 'bad_request', 'Takes are 1–500 characters')
        }
      }
      assertClean(title, body)
      await app.db.transaction(async (tx) => {
        if (title !== undefined || body !== undefined) {
          await tx
            .update(posts)
            .set({ title, body, editedAt: new Date() })
            .where(eq(posts.id, post.id))
        }
        if (tags) await saveTags(tx, post.id, tags)
      })
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
