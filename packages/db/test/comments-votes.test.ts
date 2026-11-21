import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createDb } from '../src/client.js'
import { comments, posts, users, votes } from '../src/schema/index.js'

const url = process.env.DATABASE_URL

describe.skipIf(!url)('comments and votes', () => {
  const db = createDb(url ?? '', { max: 1 })
  const run = randomUUID().slice(0, 8)
  let userId = ''
  let postId = ''

  beforeAll(async () => {
    const [user] = await db
      .insert(users)
      .values({ name: 'Voter', email: `${run}@test.dev`, handle: `voter_${run}` })
      .returning()
    const [post] = await db.insert(posts).values({ kind: 'thread', authorId: user?.id }).returning()
    userId = user?.id ?? ''
    postId = post?.id ?? ''
  })

  afterAll(async () => {
    await db.delete(posts).where(eq(posts.id, postId))
    await db.delete(users).where(eq(users.id, userId))
    await db.$client.end()
  })

  it('nests comments up to depth 6', async () => {
    let parentId: string | null = null
    for (let depth = 0; depth <= 6; depth++) {
      const [c] = await db
        .insert(comments)
        .values({ postId, parentId, authorId: userId, body: `depth ${depth}`, depth })
        .returning()
      parentId = c?.id ?? null
    }
    await expect(
      db
        .insert(comments)
        .values({ postId, parentId, authorId: userId, body: 'too deep', depth: 7 }),
    ).rejects.toThrow()
  })

  it('rejects empty comments', async () => {
    await expect(db.insert(comments).values({ postId, body: '' })).rejects.toThrow()
  })

  it('allows one vote per user per target', async () => {
    const vote = { userId, targetType: 'post' as const, targetId: postId, value: 1 }
    await db.insert(votes).values(vote)
    await expect(db.insert(votes).values({ ...vote, value: -1 })).rejects.toThrow()
    await db.insert(votes).values({ ...vote, targetType: 'comment' })
  })

  it('only accepts -1 and 1', async () => {
    await expect(
      db.insert(votes).values({ userId, targetType: 'post', targetId: randomUUID(), value: 2 }),
    ).rejects.toThrow()
  })
})
