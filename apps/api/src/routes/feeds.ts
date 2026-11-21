import { and, eq, gte, schema, sql } from '@aced/db'
import type { Page, Post } from '@aced/types'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { listPosts } from '../lib/post-list.js'
import { currentUser, requireUser } from '../user.js'
import { myVotes } from '../votes.js'

const { posts, follows, postTags } = schema

const FOR_YOU_HOURS = 48
const CACHE_KEY = 'feed:for-you:first-page'
const CACHE_SECONDS = 30

const pageQuery = z.object({ cursor: z.string().max(500).optional() })

export const feedRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/feed/following',
    { preHandler: requireUser, schema: { querystring: pageQuery } },
    async (req): Promise<Page<Post>> => {
      const userId = currentUser(req).id
      const followed = sql`(
        exists (
          select 1 from ${postTags} join ${follows}
            on ${follows.targetType}::text = ${postTags.entityType}::text
           and ${follows.targetId} = ${postTags.entityId}
          where ${postTags.postId} = ${posts.id} and ${follows.userId} = ${userId}
        )
        or exists (
          select 1 from ${follows}
          where ${and(eq(follows.userId, userId), eq(follows.targetType, 'user'))}
            and ${follows.targetId} = ${posts.authorId}
        )
      )`
      return listPosts(app.db, { where: followed, sort: 'new', t: 'all', ...req.query, userId })
    },
  )

  app.get(
    '/feed/for-you',
    { schema: { querystring: pageQuery } },
    async (req): Promise<Page<Post>> => {
      const load = () =>
        listPosts(app.db, {
          where: gte(posts.createdAt, new Date(Date.now() - FOR_YOU_HOURS * 60 * 60 * 1000)),
          sort: 'hot',
          t: 'all',
          cursor: req.query.cursor,
        })
      if (req.query.cursor) return withMyVotes(await load(), req.user?.id)

      // The shared first page is cached without per-viewer votes, which are added per request.
      let page: Page<Post> | undefined
      try {
        const cached = await app.redis.get(CACHE_KEY)
        if (cached) page = JSON.parse(cached) as Page<Post>
      } catch (err) {
        req.log.warn({ err }, 'for-you cache read failed')
      }
      if (!page) {
        page = await load()
        app.redis
          .set(CACHE_KEY, JSON.stringify(page), 'EX', CACHE_SECONDS)
          .catch((err: unknown) => {
            req.log.warn({ err }, 'for-you cache write failed')
          })
      }
      return withMyVotes(page, req.user?.id)
    },
  )

  async function withMyVotes(page: Page<Post>, userId: string | undefined): Promise<Page<Post>> {
    if (!userId) return page
    const votes = await myVotes(
      app.db,
      userId,
      'post',
      page.items.map((p) => p.id),
    )
    return { ...page, items: page.items.map((p) => ({ ...p, myVote: votes.get(p.id) ?? 0 })) }
  }
}
