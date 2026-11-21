import { and, type Db, desc, eq, gte, type SQL, schema, sql } from '@aced/db'
import type { Page, Post, PostSort, TopWindow } from '@aced/types'
import { z } from 'zod'
import { HttpError } from '../errors.js'
import { toPost } from '../mappers/social.js'
import { loadPostExtras } from '../post-extras.js'
import { decodeCursor, encodeCursor } from './cursor.js'

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

export const listQuery = z.object({
  sort: z.enum(['hot', 'new', 'top']).default('hot'),
  t: z.enum(['day', 'week', 'all']).default('week'),
  cursor: z.string().max(500).optional(),
})

/** A ranked, cursor-paginated page of visible posts matching `where`. */
export async function listPosts(
  db: Db,
  opts: { where: SQL; sort: PostSort; t: TopWindow; cursor?: string; userId?: string },
): Promise<Page<Post>> {
  const { column, value } = sorts[opts.sort]
  const after = opts.cursor ? decodeCursor(opts.cursor, z.tuple([value, z.uuid()])) : undefined
  if (after === null) throw new HttpError(400, 'bad_request', 'Invalid cursor')
  const keyText = opts.sort === 'new' ? sql<string>`${posts.createdAt}::text` : column

  const rows = await db
    .select({ post: posts, author: users, board: boards, key: keyText })
    .from(posts)
    .leftJoin(users, eq(users.id, posts.authorId))
    .leftJoin(boards, eq(boards.id, posts.boardId))
    .where(
      and(
        opts.where,
        eq(posts.isRemoved, false),
        opts.sort === 'top' && opts.t !== 'all'
          ? gte(posts.createdAt, new Date(Date.now() - (opts.t === 'day' ? 1 : 7) * DAY))
          : undefined,
        after
          ? sql`(${column}, ${posts.id}) < (${opts.sort === 'new' ? sql`${after[0]}::timestamptz` : after[0]}, ${after[1]})`
          : undefined,
      ),
    )
    .orderBy(desc(column), desc(posts.id))
    .limit(PAGE_SIZE + 1)

  const page = rows.slice(0, PAGE_SIZE)
  const ids = page.map((r) => r.post.id)
  const extras = await loadPostExtras(db, opts.userId, ids)
  const last = page.at(-1)
  return {
    items: page.map((r) => toPost(r.post, r.author, r.board, extras(r.post.id))),
    nextCursor: rows.length > PAGE_SIZE && last ? encodeCursor([last.key, last.post.id]) : null,
  }
}
