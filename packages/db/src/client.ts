import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/index.js'

export type Db = ReturnType<typeof createDb>

export function createDb(url: string, options: { max?: number } = {}) {
  const sql = postgres(url, { max: options.max ?? 10 })
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
