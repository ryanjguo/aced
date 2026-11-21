import { createDb, eq, inArray, schema, sql } from '@aced/db'
import type { ResultCardData } from '@aced/types'
import { afterAll, describe, expect, it } from 'vitest'
import { createSeriesPosts } from '../src/jobs/series-completed.js'

const url = process.env.DATABASE_URL
const { series, posts, postTags } = schema

// Runs against `pnpm db:seed` data.
describe.skipIf(!url)('series-completed job', () => {
  const db = createDb(url ?? '', { max: 1 })
  afterAll(() => db.$client.end())

  const seedSeries = async (gridId: string) =>
    (await db.select().from(series).where(eq(series.gridId, gridId)))[0]

  it('creates one result card and one match thread, tagged, idempotently', async () => {
    const s = await seedSeries('seed-series-1')
    if (!s) throw new Error('Run pnpm db:seed')
    const keys = [`result:${s.id}`, `match_thread:${s.id}`]
    await db.delete(posts).where(inArray(posts.sourceKey, keys))

    await createSeriesPosts(db, s.id)
    await createSeriesPosts(db, s.id)

    const rows = await db.select().from(posts).where(inArray(posts.sourceKey, keys))
    expect(rows.map((p) => p.kind).sort()).toEqual(['match_thread', 'result'])
    const result = rows.find((p) => p.kind === 'result')
    const data = result?.data as ResultCardData
    expect(data).toMatchObject({ type: 'result', seriesId: s.id, score: [s.scoreA, s.scoreB] })
    expect(data.maps.length).toBe(s.scoreA + s.scoreB)
    expect(rows.find((p) => p.kind === 'match_thread')?.boardId).not.toBeNull()

    const tags = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(postTags)
      .where(
        inArray(
          postTags.postId,
          rows.map((p) => p.id),
        ),
      )
    expect(tags[0]?.n).toBe(6)
  })

  it('skips series that are not completed', async () => {
    const s = await seedSeries('seed-series-16')
    expect(await createSeriesPosts(db, s?.id ?? '')).toEqual({ skipped: true })
  })
})
