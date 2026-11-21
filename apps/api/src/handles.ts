import { type Db, eq, schema } from '@aced/db'

const MAX = 20

/** Turns a display name into a valid handle: 3–20 chars of `[a-z0-9_]`. */
export function toHandle(name: string): string {
  const handle = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, MAX)
  return handle.length >= 3 ? handle : 'player'
}

// shortcut: one query per taken suffix and a race between identical names hits the unique
// constraint; fetch candidates in one query if sign-ups get slow.
export async function uniqueHandle(db: Db, name: string): Promise<string> {
  const base = toHandle(name)
  for (let n = 0; ; n++) {
    const suffix = n === 0 ? '' : String(n)
    const handle = base.slice(0, MAX - suffix.length) + suffix
    const [taken] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.handle, handle))
      .limit(1)
    if (!taken) return handle
  }
}
