import { desc, eq, schema } from '@aced/db'
import type { SitemapEntries } from '@aced/types'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

const { boards, events, teams, players, posts } = schema

const MAX_POSTS = 5000

export const sitemapRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/sitemap/entries', async (): Promise<SitemapEntries> => {
    const [b, e, t, p, recent] = await Promise.all([
      app.db.select({ slug: boards.slug }).from(boards),
      app.db.select({ slug: events.slug }).from(events),
      app.db.select({ slug: teams.slug }).from(teams),
      app.db.select({ slug: players.slug }).from(players),
      app.db
        .select({ id: posts.id, updatedAt: posts.updatedAt })
        .from(posts)
        .where(eq(posts.isRemoved, false))
        .orderBy(desc(posts.createdAt))
        .limit(MAX_POSTS),
    ])
    const slugs = (rows: { slug: string }[]) => rows.map((r) => r.slug)
    return {
      boards: slugs(b),
      events: slugs(e),
      teams: slugs(t),
      players: slugs(p),
      posts: recent.map((r) => ({ id: r.id, updatedAt: r.updatedAt.toISOString() })),
    }
  })
}
