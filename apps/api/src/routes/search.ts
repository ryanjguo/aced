import { type AnyPgColumn, desc, eq, type SQL, schema, sql } from '@aced/db'
import type { EntityResult, Page, Post, TagEntityType } from '@aced/types'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { HttpError } from '../errors.js'
import { decodeCursor, encodeCursor } from '../lib/cursor.js'
import { toPost } from '../mappers/social.js'
import { loadPostExtras } from '../post-extras.js'

const { players, teams, events, posts, users, boards } = schema

const POST_PAGE = 25

const LIMIT = 8
const ALL_TYPES: TagEntityType[] = ['player', 'team', 'event']

const query = z.object({
  q: z.string().trim().min(1).max(50),
  types: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',') : ALL_TYPES))
    .pipe(z.array(z.enum(['player', 'team', 'event'])).min(1)),
})

/** Prefix beats contains beats fuzzy; ties broken by trigram similarity. */
function score(column: AnyPgColumn, q: string): SQL<number> {
  const like = q.replace(/[\\%_]/g, '\\$&')
  return sql<number>`(case when ${column} ilike ${`${like}%`} then 2
    when ${column} ilike ${`%${like}%`} then 1 else 0 end) + similarity(${column}, ${q})`
}

function matches(column: AnyPgColumn, q: string): SQL {
  const like = q.replace(/[\\%_]/g, '\\$&')
  return sql`(${column} ilike ${`%${like}%`} or ${column} % ${q})`
}

export const searchRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/search/entities',
    { schema: { querystring: query } },
    async (req): Promise<{ items: EntityResult[] }> => {
      const { q, types } = req.query
      const want = (t: TagEntityType) => types.includes(t)

      const [playerRows, teamRows, eventRows] = await Promise.all([
        want('player')
          ? app.db
              .select({ player: players, teamTag: teams.tag, score: score(players.handle, q) })
              .from(players)
              .leftJoin(teams, eq(teams.id, players.currentTeamId))
              .where(matches(players.handle, q))
              .orderBy(desc(score(players.handle, q)))
              .limit(LIMIT)
          : [],
        want('team')
          ? app.db
              .select({
                team: teams,
                score: sql<number>`greatest(${score(teams.name, q)}, ${score(teams.tag, q)})`,
              })
              .from(teams)
              .where(sql`${matches(teams.name, q)} or ${matches(teams.tag, q)}`)
              .orderBy(desc(sql`greatest(${score(teams.name, q)}, ${score(teams.tag, q)})`))
              .limit(LIMIT)
          : [],
        want('event')
          ? app.db
              .select({ event: events, score: score(events.name, q) })
              .from(events)
              .where(matches(events.name, q))
              .orderBy(desc(score(events.name, q)))
              .limit(LIMIT)
          : [],
      ])

      const results: (EntityResult & { score: number })[] = [
        ...playerRows.map((r) => ({
          type: 'player' as const,
          id: r.player.id,
          name: r.player.handle,
          slug: r.player.slug,
          detail: r.teamTag,
          score: r.score,
        })),
        ...teamRows.map((r) => ({
          type: 'team' as const,
          id: r.team.id,
          name: r.team.name,
          slug: r.team.slug,
          detail: r.team.tag,
          score: r.score,
        })),
        ...eventRows.map((r) => ({
          type: 'event' as const,
          id: r.event.id,
          name: r.event.name,
          slug: r.event.slug,
          detail: r.event.region,
          score: r.score,
        })),
      ]
      return {
        items: results
          .sort((a, b) => b.score - a.score)
          .slice(0, LIMIT)
          .map(({ score: _, ...item }) => item),
      }
    },
  )

  app.get(
    '/search/posts',
    {
      schema: {
        querystring: z.object({
          q: z.string().trim().min(1).max(200),
          cursor: z.string().max(500).optional(),
        }),
      },
    },
    async (req): Promise<Page<Post>> => {
      const { q, cursor } = req.query
      const after = cursor ? decodeCursor(cursor, z.tuple([z.number(), z.uuid()])) : undefined
      if (after === null) throw new HttpError(400, 'bad_request', 'Invalid cursor')

      const tsquery = sql`websearch_to_tsquery('english', ${q})`
      // Rounded so the cursor round-trips exactly through JSON.
      const rank = sql<number>`round(ts_rank(${posts.searchVector}, ${tsquery})::numeric, 6)::float`
      const rows = await app.db
        .select({ post: posts, author: users, board: boards, rank })
        .from(posts)
        .leftJoin(users, eq(users.id, posts.authorId))
        .leftJoin(boards, eq(boards.id, posts.boardId))
        .where(
          sql`${posts.searchVector} @@ ${tsquery} and not ${posts.isRemoved} ${
            after ? sql`and (${rank}, ${posts.id}) < (${after[0]}, ${after[1]})` : sql``
          }`,
        )
        .orderBy(desc(rank), desc(posts.id))
        .limit(POST_PAGE + 1)

      const page = rows.slice(0, POST_PAGE)
      const ids = page.map((r) => r.post.id)
      const extras = await loadPostExtras(app.db, req.user?.id, ids)
      const last = page.at(-1)
      return {
        items: page.map((r) => toPost(r.post, r.author, r.board, extras(r.post.id))),
        nextCursor:
          rows.length > POST_PAGE && last ? encodeCursor([last.rank, last.post.id]) : null,
      }
    },
  )
}
