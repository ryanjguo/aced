import { randomUUID } from 'node:crypto'
import { createDb, eq, schema } from '@aced/db'
import { afterAll, describe, expect, it } from 'vitest'
import { refreshKarma } from '../src/jobs/karma.js'

const url = process.env.DATABASE_URL

describe.skipIf(!url)('karma job', () => {
  const db = createDb(url ?? '', { max: 1 })
  const handle = `karma_${randomUUID().slice(0, 8)}`
  let userId = ''

  afterAll(async () => {
    await db.delete(schema.posts).where(eq(schema.posts.authorId, userId))
    await db.delete(schema.users).where(eq(schema.users.id, userId))
    await db.$client.end()
  })

  it('sums scores of visible posts and comments', async () => {
    const [user] = await db
      .insert(schema.users)
      .values({ name: handle, email: `${handle}@test.dev`, handle, karma: 999 })
      .returning()
    userId = user?.id ?? ''
    const [post] = await db
      .insert(schema.posts)
      .values([
        { kind: 'take', authorId: userId, body: 'a', score: 10 },
        { kind: 'take', authorId: userId, body: 'b', score: 50, isRemoved: true },
      ])
      .returning()
    await db.insert(schema.comments).values([
      { postId: post?.id ?? '', authorId: userId, body: 'c', score: -3 },
      { postId: post?.id ?? '', authorId: userId, body: 'd', score: 5 },
    ])

    await refreshKarma(db)

    const [after] = await db.select().from(schema.users).where(eq(schema.users.id, userId))
    expect(after?.karma).toBe(12)
  })
})
