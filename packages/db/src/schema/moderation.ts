import { sql } from 'drizzle-orm'
import {
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { users } from './auth.js'
import { id } from './columns.js'

export const reportTarget = pgEnum('report_target', ['post', 'comment', 'user'])
export const reportReason = pgEnum('report_reason', [
  'spam',
  'harassment',
  'misinformation',
  'rumor_no_source',
  'other',
])
export const reportStatus = pgEnum('report_status', ['open', 'actioned', 'dismissed'])

export const reports = pgTable(
  'reports',
  {
    id: id(),
    targetType: reportTarget().notNull(),
    // Polymorphic (post, comment or user), so no foreign key.
    targetId: uuid().notNull(),
    reporterId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reason: reportReason().notNull(),
    note: text(),
    status: reportStatus().notNull().default('open'),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // One open report per reporter per target.
    uniqueIndex('reports_one_open_per_reporter')
      .on(t.reporterId, t.targetType, t.targetId)
      .where(sql`${t.status} = 'open'`),
    index().on(t.targetType, t.targetId, t.status),
    index().on(t.status, t.createdAt),
    check('reports_note_length', sql`char_length(${t.note}) <= 500`),
  ],
)
