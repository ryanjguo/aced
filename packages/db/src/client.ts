import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/index.js'

export type Db = ReturnType<typeof createDb>

export function createDb(url: string, options: { max?: number } = {}) {
  const sql = postgres(url, { max: options.max ?? 10 })
  return drizzle(sql, { schema, casing: 'snake_case' })
}

export async function pingDb(db: Db): Promise<boolean> {
  try {
    await db.execute('select 1')
    return true
  } catch {
    return false
  }
}
