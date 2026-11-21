import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'
import { createDb } from '../src/client.js'
import { posts, postTags } from '../src/schema/index.js'

const url = process.env.DATABASE_URL

describe.skipIf(!url)('post tags', () => {
  const db = createDb(url ?? '', { max: 1 })
  const postIds: string[] = []

  afterAll(async () => {
    for (const id of postIds) await db.delete(posts).where(eq(posts.id, id))
    await db.$client.end()
  })

  it('tags posts and finds posts by entity', async () => {
    const team = randomUUID()
    const player = randomUUID()
    const rows = await db
      .insert(posts)
      .values([
        { kind: 'take', body: 'a' },
        { kind: 'take', body: 'b' },
      ])
      .returning()
    postIds.push(...rows.map((p) => p.id))
    const [a, b] = rows
    await db.insert(postTags).values([
      { postId: a?.id ?? '', entityType: 'team', entityId: team },
      { postId: a?.id ?? '', entityType: 'player', entityId: player },
      { postId: b?.id ?? '', entityType: 'team', entityId: team },
    ])

    const tagged = await db
      .select({ postId: postTags.postId })
      .from(postTags)
      .where(and(eq(postTags.entityType, 'team'), eq(postTags.entityId, team)))
    expect(tagged.map((t) => t.postId).sort()).toEqual([a?.id, b?.id].sort())

    await expect(
      db.insert(postTags).values({ postId: a?.id ?? '', entityType: 'team', entityId: team }),
    ).rejects.toThrow()
  })

  it('removes tags with their post', async () => {
    const [post] = await db.insert(posts).values({ kind: 'take', body: 'c' }).returning()
    await db
      .insert(postTags)
      .values({ postId: post?.id ?? '', entityType: 'event', entityId: randomUUID() })
    await db.delete(posts).where(eq(posts.id, post?.id ?? ''))
    const left = await db
      .select()
      .from(postTags)
      .where(eq(postTags.postId, post?.id ?? ''))
    expect(left).toHaveLength(0)
  })
})
