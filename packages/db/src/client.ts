import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/index.js'

export type Db = ReturnType<typeof createDb>
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

/**
 * A pooled client. Every query gets a statement timeout (5s unless overridden) so one slow query
 * fails that request instead of holding connections and taking the API down.
 */
export function createDb(url: string, options: { max?: number; statementTimeoutMs?: number } = {}) {
  const sql = postgres(url, {
    max: options.max ?? 10,
    connection: {
      statement_timeout: options.statementTimeoutMs ?? 5000,
      idle_in_transaction_session_timeout: 10_000,
    },
  })
  return drizzle(sql, { schema, casing: 'snake_case' })
}

export async function pingDb(db: Db, timeoutMs = 1000): Promise<boolean> {
  const timeout = new Promise<false>((resolve) => setTimeout(() => resolve(false), timeoutMs))
  const ping = db.execute('select 1').then(
    () => true,
    () => false,
  )
  return Promise.race([ping, timeout])
}
