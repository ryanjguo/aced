import { randomUUID } from 'node:crypto'
import { eq, inArray, schema } from '@aced/db'
import type { CommentNode } from '@aced/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildTestApp, createPost, createUser } from './build-test-app.js'

const { users, posts, comments } = schema

describe('reports', () => {
  const app = buildTestApp()
  const userIds: string[] = []
  const cookies: string[] = []

  beforeAll(async () => {
    // Established accounts: auto-hide only counts reporters older than 7 days.
    const createdAt = new Date(Date.now() - 8 * 86_400_000)
    for (let i = 0; i < 6; i++) {
      const user = await createUser(app, 'r', { createdAt })
      userIds.push(user.id)
      cookies.push(user.cookie)
    }
  })

  afterAll(async () => {
    await app.db.delete(posts).where(inArray(posts.authorId, userIds))
    await app.db.delete(users).where(inArray(users.id, userIds))
    await app.close()
  })

  const newPost = () => createPost(app, cookies[0], 'Report me')

  const report = (targetType: string, targetId: string, cookie = cookies[1], reason = 'spam') =>
    app.inject({
      method: 'POST',
      url: '/reports',
      headers: { cookie },
      payload: { targetType, targetId, reason, note: 'see title' },
    })

  it('creates a report once per reporter', async () => {
    const post = await newPost()
    expect((await report('post', post.id)).statusCode).toBe(201)
    const dup = await report('post', post.id)
    expect(dup.statusCode).toBe(409)
    expect(dup.json()).toMatchObject({ error: { code: 'already_reported' } })
  })

  it('hides a post at 5 reporters, not before', async () => {
    const post = await newPost()
    for (const cookie of cookies.slice(1, 5)) await report('post', post.id, cookie)
    const before = await app.db.select().from(posts).where(eq(posts.id, post.id))
    expect(before[0]?.isRemoved).toBe(false)
    await report('post', post.id, cookies[5])
    const after = await app.db.select().from(posts).where(eq(posts.id, post.id))
    expect(after[0]?.isRemoved).toBe(true)
  })

  it('hides a comment at 5 reporters and updates the count', async () => {
    const post = await newPost()
    const comment = (
      await app.inject({
        method: 'POST',
        url: `/posts/${post.id}/comments`,
        headers: { cookie: cookies[0] },
        payload: { body: 'bad comment' },
      })
    ).json<CommentNode>()
    for (const cookie of cookies.slice(1)) await report('comment', comment.id, cookie)
    const [row] = await app.db.select().from(comments).where(eq(comments.id, comment.id))
    expect(row?.isRemoved).toBe(true)
    const [p] = await app.db.select().from(posts).where(eq(posts.id, post.id))
    expect(p?.commentCount).toBe(0)
  })

  it('reports users without hiding anything', async () => {
    expect((await report('user', userIds[0] ?? '', cookies[2], 'harassment')).statusCode).toBe(201)
  })

  it('validates targets and reasons', async () => {
    expect((await report('post', randomUUID())).statusCode).toBe(404)
    const post = await newPost()
    expect((await report('post', post.id, cookies[1], 'boring')).statusCode).toBe(400)
    expect((await report('post', post.id, '')).statusCode).toBe(401)
  })

  it("doesn't let brand-new accounts auto-hide a post", async () => {
    const post = await newPost()
    for (let i = 0; i < 5; i++) {
      const fresh = await createUser(app, 'rn')
      userIds.push(fresh.id)
      expect((await report('post', post.id, fresh.cookie)).statusCode).toBe(201)
    }
    const [row] = await app.db.select().from(posts).where(eq(posts.id, post.id))
    expect(row?.isRemoved).toBe(false)
  })
})

describe('report and follow rate limits', () => {
  const app = buildTestApp({ rateLimits: true })
  const userIds: string[] = []

  afterAll(async () => {
    await app.db.delete(posts).where(inArray(posts.authorId, userIds))
    await app.db.delete(users).where(inArray(users.id, userIds))
    await app.close()
  })

  it('limits reports to 5 an hour for new accounts', async () => {
    const reporter = await createUser(app, 'rl')
    const author = await createUser(app, 'rl')
    userIds.push(reporter.id, author.id)
    const codes: number[] = []
    for (let i = 0; i < 6; i++) {
      // Inserted directly: the author's own post limit isn't under test here.
      const [post] = await app.db
        .insert(posts)
        .values({ kind: 'take', body: `post ${i}`, authorId: author.id })
        .returning()
      const res = await app.inject({
        method: 'POST',
        url: '/reports',
        headers: { cookie: reporter.cookie },
        payload: { targetType: 'post', targetId: post?.id, reason: 'spam' },
      })
      codes.push(res.statusCode)
    }
    expect(codes).toEqual([201, 201, 201, 201, 201, 429])
  })

  it('limits follow changes to 30 an hour for new accounts', async () => {
    const fan = await createUser(app, 'rl')
    const star = await createUser(app, 'rl')
    userIds.push(fan.id, star.id)
    const follow = () =>
      app.inject({
        method: 'PUT',
        url: `/follows/user/${star.id}`,
        headers: { cookie: fan.cookie },
      })
    for (let i = 0; i < 30; i++) expect((await follow()).statusCode).toBe(204)
    expect((await follow()).statusCode).toBe(429)
  })
})
