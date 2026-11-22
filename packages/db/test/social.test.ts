import { randomUUID } from 'node:crypto'
import { eq, inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'
import { createDb } from '../src/client.js'
import { boards, postKind, posts } from '../src/schema/index.js'

const url = process.env.DATABASE_URL

describe.skipIf(!url)('boards and posts', () => {
  const db = createDb(url ?? '', { max: 1 })
  const postIds: string[] = []

  afterAll(async () => {
    if (postIds.length) await db.delete(posts).where(inArray(posts.id, postIds))
    await db.$client.end()
  })

  it('has the launch boards', async () => {
    const rows = await db.select().from(boards).orderBy(boards.sortOrder)
    expect(rows.map((b) => b.slug)).toEqual(
      expect.arrayContaining(['general', 'transfers', 'match-threads', 'clips']),
    )
  })

  it('stores a post of every kind', async () => {
    const [general] = await db.select().from(boards).where(eq(boards.slug, 'general'))
    const rows = await db
      .insert(posts)
      .values(postKind.enumValues.map((kind) => ({ kind, boardId: general?.id, body: kind })))
      .returning()
    postIds.push(...rows.map((p) => p.id))
    expect(rows.map((p) => p.kind)).toEqual(postKind.enumValues)
    expect(rows[0]).toMatchObject({ score: 0, hotScore: 0, commentCount: 0, isRemoved: false })
  })

  it('keeps source_key unique', async () => {
    const sourceKey = `test:${randomUUID()}`
    const [post] = await db.insert(posts).values({ kind: 'result', sourceKey }).returning()
    if (post) postIds.push(post.id)
    await expect(db.insert(posts).values({ kind: 'result', sourceKey })).rejects.toThrow()
  })

  it('caps the body at 40k characters', async () => {
    await expect(
      db.insert(posts).values({ kind: 'thread', body: 'x'.repeat(40_001) }),
    ).rejects.toThrow()
  })
})
