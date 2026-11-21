import { sql } from 'drizzle-orm'
import {
  type AnyPgColumn,
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { users } from './auth.js'
import { citext, id, timestamps, tsvector } from './columns.js'
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
    // Full-text search over title and body.
    searchVector: tsvector().generatedAlwaysAs(
      sql`to_tsvector('english', coalesce(title, '') || ' ' || body)`,
    ),
  },
  (t) => [
    index('posts_search_idx').using('gin', t.searchVector),
    index().on(t.boardId, t.hotScore.desc()),
    index().on(t.boardId, t.createdAt.desc()),
    index().on(t.authorId, t.createdAt.desc()),
    index().on(t.createdAt.desc()),
    check('posts_body_length', sql`char_length(${t.body}) <= 40000`),
  ],
)

export const comments = pgTable(
  'comments',
  {
    id: id(),
    postId: uuid()
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    parentId: uuid().references((): AnyPgColumn => comments.id, { onDelete: 'cascade' }),
    authorId: uuid().references(() => users.id, { onDelete: 'set null' }),
    body: text().notNull(),
    score: integer().notNull().default(0),
    depth: smallint().notNull().default(0),
    isRemoved: boolean().notNull().default(false),
    ...timestamps,
    editedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    index().on(t.postId, t.createdAt),
    index().on(t.parentId),
    check('comments_body_length', sql`char_length(${t.body}) between 1 and 10000`),
    check('comments_depth_range', sql`${t.depth} between 0 and 6`),
  ],
)

export const voteTarget = pgEnum('vote_target', ['post', 'comment'])

export const votes = pgTable(
  'votes',
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    targetType: voteTarget().notNull(),
    // Polymorphic (post or comment), so no foreign key.
    targetId: uuid().notNull(),
    value: smallint().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.targetType, t.targetId] }),
    index().on(t.targetType, t.targetId),
    check('votes_value', sql`${t.value} in (-1, 1)`),
  ],
)

export const tagEntity = pgEnum('tag_entity', ['player', 'team', 'event'])

export const postTags = pgTable(
  'post_tags',
  {
    postId: uuid()
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    entityType: tagEntity().notNull(),
    // Polymorphic (player, team or event), so no foreign key.
    entityId: uuid().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.postId, t.entityType, t.entityId] }),
    index().on(t.entityType, t.entityId, t.postId),
  ],
)

export const followTarget = pgEnum('follow_target', ['player', 'team', 'event', 'user'])

export const follows = pgTable(
  'follows',
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    targetType: followTarget().notNull(),
    // Polymorphic, so no foreign key.
    targetId: uuid().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.targetType, t.targetId] }),
    index().on(t.targetType, t.targetId),
  ],
)
