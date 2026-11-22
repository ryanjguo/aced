import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { citext, id, timestamps } from './columns.js'

export const userRole = pgEnum('user_role', ['user', 'moderator', 'admin'])

// Tables follow Better Auth's core schema; column keys must match its field names.
export const users = pgTable(
  'users',
  {
    id: id(),
    name: text().notNull(),
    email: citext().notNull().unique(),
    emailVerified: boolean().notNull().default(false),
    image: text(),
    handle: citext().notNull().unique(),
    role: userRole().notNull().default('user'),
    karma: integer().notNull().default(0),
    bio: text(),
    ...timestamps,
  },
  (t) => [check('users_handle_format', sql`${t.handle}::text ~ '^[a-z0-9_]{3,20}$'`)],
)

export const sessions = pgTable(
  'sessions',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text().notNull().unique(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ipAddress: text(),
    userAgent: text(),
    ...timestamps,
  },
  (t) => [index().on(t.userId)],
)

export const accounts = pgTable(
  'accounts',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: text().notNull(),
    providerId: text().notNull(),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    ...timestamps,
  },
  (t) => [index().on(t.userId)],
)

export const verifications = pgTable(
  'verifications',
  {
    id: id(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index().on(t.identifier)],
)
