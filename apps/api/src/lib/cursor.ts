import type { z } from 'zod'

/** Opaque cursor: base64url JSON of the last row's sort key, e.g. `[score, id]`. */
export function encodeCursor(key: unknown[]): string {
  return Buffer.from(JSON.stringify(key)).toString('base64url')
}

/** Decodes and validates a cursor; returns null if it's malformed. */
export function decodeCursor<T>(cursor: string, schema: z.ZodType<T>): T | null {
  try {
    const parsed = schema.safeParse(JSON.parse(Buffer.from(cursor, 'base64url').toString()))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}
