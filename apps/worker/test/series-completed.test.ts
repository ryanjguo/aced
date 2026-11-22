import { createDb, inArray, schema, sql } from '@aced/db'
import type { ResultCardData } from '@aced/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createSeriesPosts } from '../src/jobs/series-completed.js'
import { createEsportsFixture, type EsportsFixture } from './fixtures.js'

const url = process.env.DATABASE_URL
const { posts, postTags } = schema

describe.skipIf(!url)('series-completed job', () => {
  const db = createDb(url ?? '', { max: 1 })
  let fx: EsportsFixture | undefined

  beforeAll(async () => {
    fx = await createEsportsFixture(db)
  })
  afterAll(async () => {
    await fx?.cleanup()
    await db.$client.end()
  })

  it('creates one result card and one match thread, tagged, idempotently', async () => {
    const s = fx?.completed
    if (!s) throw new Error('fixture missing')
    const keys = [`result:${s.id}`, `match_thread:${s.id}`]

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
    expect(await createSeriesPosts(db, fx?.scheduled.id ?? '')).toEqual({ skipped: true })
  })
})
