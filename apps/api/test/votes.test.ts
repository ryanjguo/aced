import { randomUUID } from 'node:crypto'
import { inArray, schema } from '@aced/db'
import type { CommentNode, Page, Post, VoteResult } from '@aced/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildTestApp, createPost, createUser } from './build-test-app.js'

const { users, posts } = schema

describe('votes', () => {
  const app = buildTestApp()
  const userIds: string[] = []
  const cookies: string[] = []

  beforeAll(async () => {
    // cookies[3] only authors posts and comments, so voters never vote on their own content.
    for (let i = 0; i < 4; i++) {
      const user = await createUser(app, 'v')
      userIds.push(user.id)
      cookies.push(user.cookie)
    }
  })

  afterAll(async () => {
    await app.db.delete(posts).where(inArray(posts.authorId, userIds))
    await app.db.delete(users).where(inArray(users.id, userIds))
    await app.close()
  })

  const newPost = () => createPost(app, cookies[3], 'Vote on me')

  const vote = (targetType: string, targetId: string, value: number, cookie = cookies[0]) =>
    app.inject({
      method: 'PUT',
      url: '/votes',
      headers: { cookie },
      payload: { targetType, targetId, value },
    })

  it('votes, changes and removes a vote', async () => {
    const post = await newPost()
    expect((await vote('post', post.id, 1)).json<VoteResult>()).toEqual({ score: 1, myVote: 1 })
    expect((await vote('post', post.id, -1)).json<VoteResult>()).toEqual({ score: -1, myVote: -1 })
    expect((await vote('post', post.id, 0)).json<VoteResult>()).toEqual({ score: 0, myVote: 0 })
  })

  it('keeps the score exact under repeated and concurrent votes', async () => {
    const post = await newPost()
    await Promise.all([
      ...Array.from({ length: 5 }, () => vote('post', post.id, 1, cookies[0])),
      ...Array.from({ length: 5 }, () => vote('post', post.id, 1, cookies[1])),
      ...Array.from({ length: 5 }, () => vote('post', post.id, -1, cookies[2])),
    ])
    const res = await app.inject({
      method: 'GET',
      url: `/posts/${post.id}`,
      headers: { cookie: cookies[1] },
    })
    expect(res.json<Post>()).toMatchObject({ score: 1, myVote: 1 })
  })

  it('shows myVote on comments and 0 when signed out', async () => {
    const post = await newPost()
    const comment = (
      await app.inject({
        method: 'POST',
        url: `/posts/${post.id}/comments`,
        headers: { cookie: cookies[3] },
        payload: { body: 'nice' },
      })
    ).json<CommentNode>()
    await vote('comment', comment.id, -1)

    const tree = (cookie?: string) =>
      app.inject({
        method: 'GET',
        url: `/posts/${post.id}/comments`,
        headers: cookie ? { cookie } : {},
      })
    expect((await tree(cookies[0])).json<Page<CommentNode>>().items[0]).toMatchObject({
      score: -1,
      myVote: -1,
    })
    expect((await tree()).json<Page<CommentNode>>().items[0]?.myVote).toBe(0)
  })

  it('rejects votes on removed or missing content', async () => {
    const post = await newPost()
    await app.inject({
      method: 'DELETE',
      url: `/posts/${post.id}`,
      headers: { cookie: cookies[3] },
    })
    expect((await vote('post', post.id, 1)).statusCode).toBe(403)
    expect((await vote('post', randomUUID(), 1)).statusCode).toBe(404)
    expect((await vote('post', post.id, 2)).statusCode).toBe(400)
  })

  it('requires sign-in', async () => {
    const post = await newPost()
    expect((await vote('post', post.id, 1, '')).statusCode).toBe(401)
  })

  it('rejects votes on your own posts and comments', async () => {
    const post = await newPost()
    const comment = (
      await app.inject({
        method: 'POST',
        url: `/posts/${post.id}/comments`,
        headers: { cookie: cookies[3] },
        payload: { body: 'mine' },
      })
    ).json<CommentNode>()
    for (const [type, id] of [
      ['post', post.id],
      ['comment', comment.id],
    ] as const) {
      const res = await vote(type, id, 1, cookies[3])
      expect(res.statusCode).toBe(403)
      expect(res.json()).toMatchObject({ error: { code: 'forbidden' } })
    }
    expect((await vote('post', post.id, 1, cookies[0])).statusCode).toBe(200)
  })
})
