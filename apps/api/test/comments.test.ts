import { eq, inArray, schema } from '@aced/db'
import type { CommentNode, Page, Post } from '@aced/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildTestApp, createPost, createUser } from './build-test-app.js'

const { users, posts } = schema

describe('comments', () => {
  const app = buildTestApp()
  const userIds: string[] = []
  let author = { cookie: '' }
  let other = { cookie: '' }

  const newUser = async () => {
    const user = await createUser(app, 'c')
    userIds.push(user.id)
    return user
  }

  const newPost = () => createPost(app, author.cookie, 'Discuss')

  const reply = (postId: string, body: string, parentId?: string, cookie = author.cookie) =>
    app.inject({
      method: 'POST',
      url: `/posts/${postId}/comments`,
      headers: { cookie },
      payload: { body, parentId },
    })

  const getPost = async (id: string) =>
    (await app.inject({ method: 'GET', url: `/posts/${id}` })).json<Post>()

  beforeAll(async () => {
    author = await newUser()
    other = await newUser()
  })

  afterAll(async () => {
    await app.db.delete(posts).where(inArray(posts.authorId, userIds))
    await app.db.delete(users).where(inArray(users.id, userIds))
    await app.close()
  })

  it('nests replies and caps depth at 6', async () => {
    const post = await newPost()
    let parentId: string | undefined
    for (let depth = 0; depth <= 6; depth++) {
      const res = await reply(post.id, `depth ${depth}`, parentId)
      expect(res.statusCode).toBe(201)
      parentId = res.json<CommentNode>().id
    }
    expect((await reply(post.id, 'too deep', parentId)).statusCode).toBe(400)

    const { items } = (await app.inject({ method: 'GET', url: `/posts/${post.id}/comments` })).json<
      Page<CommentNode>
    >()
    let node = items[0]
    for (let depth = 0; depth < 6; depth++) {
      expect(node).toMatchObject({ depth, replyCount: 1 })
      node = node?.replies[0]
    }
    expect(node).toMatchObject({ depth: 6, replyCount: 0, replies: [] })
  })

  it('loads replies of one comment', async () => {
    const post = await newPost()
    const root = (await reply(post.id, 'root')).json<CommentNode>()
    await reply(post.id, 'a', root.id)
    await reply(post.id, 'b', root.id)
    const res = await app.inject({ method: 'GET', url: `/comments/${root.id}/replies` })
    expect(
      res
        .json<{ items: CommentNode[] }>()
        .items.map((c) => c.body)
        .sort(),
    ).toEqual(['a', 'b'])
  })

  it('pages top-level comments', async () => {
    const post = await newPost()
    for (let i = 0; i < 30; i++) await reply(post.id, `c${i}`)
    const first = (await app.inject({ method: 'GET', url: `/posts/${post.id}/comments` })).json<
      Page<CommentNode>
    >()
    expect(first.items).toHaveLength(25)
    const second = (
      await app.inject({
        method: 'GET',
        url: `/posts/${post.id}/comments?cursor=${first.nextCursor}`,
      })
    ).json<Page<CommentNode>>()
    expect(second.nextCursor).toBeNull()
    const ids = [...first.items, ...second.items].map((c) => c.id)
    expect(new Set(ids).size).toBe(30)
  })

  it('keeps comment_count in step with creates and deletes', async () => {
    const post = await newPost()
    const c = (await reply(post.id, 'one')).json<CommentNode>()
    await reply(post.id, 'two')
    expect((await getPost(post.id)).commentCount).toBe(2)
    await app.inject({
      method: 'DELETE',
      url: `/comments/${c.id}`,
      headers: { cookie: author.cookie },
    })
    expect((await getPost(post.id)).commentCount).toBe(1)
  })

  it('rejects comments on locked posts', async () => {
    const post = await newPost()
    await app.db.update(posts).set({ isLocked: true }).where(eq(posts.id, post.id))
    const res = await reply(post.id, 'hello')
    expect(res.statusCode).toBe(403)
    expect(res.json()).toMatchObject({ error: { code: 'locked' } })
  })

  it('requires sign-in and lets only the author edit or delete', async () => {
    const post = await newPost()
    expect((await reply(post.id, 'anon', undefined, '')).statusCode).toBe(401)
    const c = (await reply(post.id, 'mine')).json<CommentNode>()
    const edit = (cookie: string) =>
      app.inject({
        method: 'PATCH',
        url: `/comments/${c.id}`,
        headers: { cookie },
        payload: { body: 'edited' },
      })
    expect((await edit(other.cookie)).statusCode).toBe(403)
    expect((await edit(author.cookie)).json<CommentNode>()).toMatchObject({
      body: 'edited',
      editedAt: expect.any(String),
    })
    const del = (cookie: string) =>
      app.inject({ method: 'DELETE', url: `/comments/${c.id}`, headers: { cookie } })
    expect((await del(other.cookie)).statusCode).toBe(403)
    expect((await del(author.cookie)).statusCode).toBe(204)

    const { items } = (await app.inject({ method: 'GET', url: `/posts/${post.id}/comments` })).json<
      Page<CommentNode>
    >()
    expect(items[0]).toMatchObject({ isRemoved: true, body: '', author: null })
  })
})
