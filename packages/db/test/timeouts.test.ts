import { describe, expect, it } from 'vitest'
import { createDb } from '../src/client.js'

const url = process.env.DATABASE_URL

describe.skipIf(!url)('statement timeout', () => {
  it('defaults to 5 seconds', async () => {
    const db = createDb(url ?? '', { max: 1 })
    const [row] = await db.execute<{ statement_timeout: string }>('show statement_timeout')
    expect(row?.statement_timeout).toBe('5s')
    await db.$client.end()
  })

  it('cancels a query that runs too long', async () => {
    const db = createDb(url ?? '', { max: 1, statementTimeoutMs: 200 })
    await expect(db.execute('select pg_sleep(1)')).rejects.toMatchObject({
      cause: { code: '57014' },
    })
    await db.$client.end()
  })
})
