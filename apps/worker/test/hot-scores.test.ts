import { createDb, inArray, schema, sql } from '@aced/db'
import { hotScore } from '@aced/ranking'
import { afterAll, describe, expect, it } from 'vitest'
import { refreshHotScores } from '../src/jobs/hot-scores.js'

const url = process.env.DATABASE_URL

describe.skipIf(!url)('hot-scores job', () => {
  const db = createDb(url ?? '', { max: 1 })
  const ids: string[] = []

  afterAll(async () => {
    await db.delete(schema.posts).where(inArray(schema.posts.id, ids))
    await db.$client.end()
  })

  it('matches hotScore() for recent posts and skips old ones', async () => {
    const rows = await db
      .insert(schema.posts)
      .values([
        { kind: 'take', body: 'a', score: 42, createdAt: sql`now() - interval '1 hour'` },
        { kind: 'take', body: 'b', score: -3, createdAt: sql`now() - interval '2 days'` },
        { kind: 'take', body: 'c', score: 99, createdAt: sql`now() - interval '30 days'` },
      ])
      .returning()
    ids.push(...rows.map((r) => r.id))

    await refreshHotScores(db)

    const after = await db.select().from(schema.posts).where(inArray(schema.posts.id, ids))
    for (const post of after) {
      if (post.body === 'c') expect(post.hotScore).toBe(0)
      else expect(post.hotScore).toBeCloseTo(hotScore(post.score, post.createdAt), 6)
    }
  })
})
