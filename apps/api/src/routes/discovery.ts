import { schema, sql } from '@aced/db'
import type { AcsLeader, TagEntityType, TrendingEntity } from '@aced/types'
import type { FastifyInstance } from 'fastify'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

const { posts, postTags, players, teams, events, playerMapStats, maps } = schema

/** Reads a cached JSON value or computes and stores it; a Redis outage just skips the cache. */
async function cached<T>(
  app: FastifyInstance,
  key: string,
  seconds: number,
  load: () => Promise<T>,
) {
  const hit = await app.redis.get(key).catch(() => null)
  if (hit) return JSON.parse(hit) as T
  const value = await load()
  await app.redis.set(key, JSON.stringify(value), 'EX', seconds).catch(() => {})
  return value
}

export const discoveryRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/trending',
    { schema: { querystring: z.object({ window: z.enum(['24h']).default('24h') }) } },
    async (): Promise<{ items: TrendingEntity[] }> =>
      cached(app, 'trending:24h', 300, async () => {
        // Each tagged post counts 1 plus its positive score, so well-liked discussion ranks higher.
        const rows = await app.db.execute<{
          type: TagEntityType
          id: string
          name: string
          slug: string
          posts: number
        }>(sql`
          select t.entity_type as type, t.entity_id as id,
                 coalesce(pl.handle, tm.name, ev.name) as name,
                 coalesce(pl.slug, tm.slug, ev.slug)::text as slug,
                 count(*)::int as posts
          from ${postTags} t
          join ${posts} p on p.id = t.post_id
          left join ${players} pl on t.entity_type = 'player' and pl.id = t.entity_id
          left join ${teams} tm on t.entity_type = 'team' and tm.id = t.entity_id
          left join ${events} ev on t.entity_type = 'event' and ev.id = t.entity_id
          where p.created_at > now() - interval '24 hours' and not p.is_removed
          group by 1, 2, 3, 4
          having coalesce(pl.handle, tm.name, ev.name) is not null
          order by sum(1 + greatest(p.score, 0)) desc, count(*) desc
          limit 8
        `)
        return { items: [...rows] }
      }),
  )

  app.get(
    '/leaderboards/acs',
    {
      schema: {
        querystring: z.object({
          days: z.coerce.number().int().min(1).max(30).default(7),
          limit: z.coerce.number().int().min(1).max(20).default(5),
        }),
      },
    },
    async (req): Promise<{ items: AcsLeader[] }> => {
      const { days, limit } = req.query
      return cached(app, `leaderboard:acs:${days}:${limit}`, 900, async () => {
        const rows = await app.db.execute<{
          handle: string
          slug: string
          team_tag: string | null
          team_slug: string | null
          acs: number
          maps: number
        }>(sql`
          select pl.handle, pl.slug::text as slug, tm.tag as team_tag, tm.slug::text as team_slug,
                 round(avg(s.acs))::int as acs, count(*)::int as maps
          from ${playerMapStats} s
          join ${maps} m on m.id = s.map_id
          join ${players} pl on pl.id = s.player_id
          left join ${teams} tm on tm.id = pl.current_team_id
          where m.completed_at > now() - make_interval(days => ${days}) and s.acs is not null
          group by pl.id, tm.id
          having count(*) >= 2
          order by avg(s.acs) desc, pl.handle
          limit ${limit}
        `)
        return {
          items: rows.map((r, i) => ({
            rank: i + 1,
            player: { handle: r.handle, slug: r.slug },
            team: r.team_tag && r.team_slug ? { tag: r.team_tag, slug: r.team_slug } : null,
            acs: r.acs,
            maps: r.maps,
          })),
        }
      })
    },
  )
}
