import { randomUUID } from 'node:crypto'
import { eq, inArray, schema } from '@aced/db'
import type { CommentNode, Post } from '@aced/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildTestApp, signIn } from './build-test-app.js'

const { users, posts, comments } = schema

describe('reports', () => {
  const app = buildTestApp()
  const userIds: string[] = []
  const cookies: string[] = []

  beforeAll(async () => {
    for (let i = 0; i < 6; i++) {
      const run = randomUUID().slice(0, 8)
      const [user] = await app.db
        .insert(users)
        .values({ name: run, email: `${run}@test.dev`, handle: `r_${run}` })
        .returning()
      if (!user) throw new Error('insert failed')
      userIds.push(user.id)
      cookies.push((await signIn(app, user.id)).cookie)
    }
  })

  afterAll(async () => {
    await app.db.delete(posts).where(inArray(posts.authorId, userIds))
    await app.db.delete(users).where(inArray(users.id, userIds))
    await app.close()
  })

  const newPost = async () =>
    (
      await app.inject({
        method: 'POST',
        url: '/posts',
        headers: { cookie: cookies[0] },
        payload: { kind: 'take', body: 'Report me' },
      })
    ).json<Post>()

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
})
