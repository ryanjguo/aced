import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { users } from './auth.js'
import { citext, id, timestamps } from './columns.js'
import { series } from './esports.js'

export const boards = pgTable('boards', {
  id: id(),
  slug: citext().notNull().unique(),
  name: text().notNull(),
  description: text().notNull().default(''),
  sortOrder: smallint().notNull().default(0),
  ...timestamps,
})

export const postKind = pgEnum('post_kind', [
  'take',
  'thread',
  'link',
  'clip',
  'rumor',
  'match_thread',
  'result',
  'stat_card',
  'transfer',
])

export const posts = pgTable(
  'posts',
  {
    id: id(),
    kind: postKind().notNull(),
    // Null for system posts (generated cards, match threads).
    authorId: uuid().references(() => users.id, { onDelete: 'set null' }),
    // Null for feed-only takes.
    boardId: uuid().references(() => boards.id, { onDelete: 'set null' }),
    title: text(),
    body: text().notNull().default(''),
    url: text(),
    seriesId: uuid().references(() => series.id, { onDelete: 'set null' }),
    // Deterministic key that makes generated posts idempotent.
    sourceKey: text().unique(),
    score: integer().notNull().default(0),
    hotScore: doublePrecision().notNull().default(0),
    commentCount: integer().notNull().default(0),
    isRemoved: boolean().notNull().default(false),
    isLocked: boolean().notNull().default(false),
    ...timestamps,
    editedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    index().on(t.boardId, t.hotScore.desc()),
    index().on(t.boardId, t.createdAt.desc()),
    index().on(t.authorId, t.createdAt.desc()),
    index().on(t.createdAt.desc()),
    check('posts_body_length', sql`char_length(${t.body}) <= 40000`),
  ],
)
