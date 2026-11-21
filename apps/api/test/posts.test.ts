import { randomUUID } from 'node:crypto'
import { eq, inArray, schema } from '@aced/db'
import type { Post } from '@aced/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildTestApp, signIn } from './build-test-app.js'

const { users, posts, boards } = schema

describe('posts', () => {
  const app = buildTestApp()
  const userIds: string[] = []
  let boardId = ''
  let author = { cookie: '' }
  let other = { cookie: '' }

  const createUser = async () => {
    const run = randomUUID().slice(0, 8)
    const [user] = await app.db
      .insert(users)
      .values({ name: run, email: `${run}@test.dev`, handle: `p_${run}` })
      .returning()
    if (!user) throw new Error('insert failed')
    userIds.push(user.id)
    return signIn(app, user.id)
  }

  const create = (payload: object, cookie = author.cookie) =>
    app.inject({ method: 'POST', url: '/posts', headers: { cookie }, payload })

  beforeAll(async () => {
    const [general] = await app.db.select().from(boards).where(eq(boards.slug, 'general'))
    boardId = general?.id ?? ''
    author = await createUser()
    other = await createUser()
  })

  afterAll(async () => {
    await app.db.delete(posts).where(inArray(posts.authorId, userIds))
    await app.db.delete(users).where(inArray(users.id, userIds))
    await app.close()
  })

  it.each([
    [{ kind: 'thread', boardId: '$board', title: 'Best duelist?', body: 'Discuss.' }],
    [{ kind: 'link', boardId: '$board', title: 'Interview', url: 'https://example.com/a' }],
    [{ kind: 'take', body: 'Hot take incoming' }],
    [{ kind: 'take', body: 'Board take', boardId: '$board' }],
  ])('creates %j', async (input) => {
    const payload = { ...input, ...('boardId' in input && { boardId }) }
    const res = await create(payload)
    expect(res.statusCode).toBe(201)
    const post = res.json<Post>()
    expect(post).toMatchObject({ kind: input.kind, score: 0, isRemoved: false })
    expect(post.author?.handle).toMatch(/^p_/)
  })

  it.each([
    ['thread without board', { kind: 'thread', title: 'x' }],
    ['thread without title', { kind: 'thread', boardId: '$board' }],
    ['link with a bad url', { kind: 'link', boardId: '$board', title: 'x', url: 'ftp://x' }],
    ['take over 500 chars', { kind: 'take', body: 'x'.repeat(501) }],
    ['empty take', { kind: 'take', body: '   ' }],
    ['system kind', { kind: 'result', body: 'x' }],
    ['unknown board', { kind: 'thread', boardId: randomUUID(), title: 'x' }],
  ])('rejects %s', async (_, input) => {
    const payload = {
      ...input,
      ...('boardId' in input && input.boardId === '$board' && { boardId }),
    }
    const res = await create(payload)
    expect(res.statusCode).toBe(400)
  })

  it('requires sign-in to create', async () => {
    const res = await create({ kind: 'take', body: 'hi' }, '')
    expect(res.statusCode).toBe(401)
  })

  it('reads a post and 404s unknown ids', async () => {
    const post = (await create({ kind: 'take', body: 'readable' })).json<Post>()
    const res = await app.inject({ method: 'GET', url: `/posts/${post.id}` })
    expect(res.json<Post>().body).toBe('readable')
    const missing = await app.inject({ method: 'GET', url: `/posts/${randomUUID()}` })
    expect(missing.statusCode).toBe(404)
  })

  it('lets only the author edit, and marks the edit', async () => {
    const post = (await create({ kind: 'thread', boardId, title: 'Old', body: 'a' })).json<Post>()
    const edit = (cookie: string, payload: object) =>
      app.inject({ method: 'PATCH', url: `/posts/${post.id}`, headers: { cookie }, payload })

    expect((await edit(other.cookie, { title: 'Hacked' })).statusCode).toBe(403)
    const res = await edit(author.cookie, { title: 'New', body: 'b' })
    expect(res.json<Post>()).toMatchObject({
      title: 'New',
      body: 'b',
      editedAt: expect.any(String),
    })
  })

  it('keeps take rules on edit', async () => {
    const post = (await create({ kind: 'take', body: 'short' })).json<Post>()
    const edit = (payload: object) =>
      app.inject({
        method: 'PATCH',
        url: `/posts/${post.id}`,
        headers: { cookie: author.cookie },
        payload,
      })
    expect((await edit({ title: 'nope' })).statusCode).toBe(400)
    expect((await edit({ body: 'x'.repeat(501) })).statusCode).toBe(400)
  })

  it('soft-deletes for the author only', async () => {
    const post = (
      await create({ kind: 'link', boardId, title: 'T', url: 'https://x.dev' })
    ).json<Post>()
    const del = (cookie: string) =>
      app.inject({ method: 'DELETE', url: `/posts/${post.id}`, headers: { cookie } })

    expect((await del(other.cookie)).statusCode).toBe(403)
    expect((await del(author.cookie)).statusCode).toBe(204)
    const res = await app.inject({ method: 'GET', url: `/posts/${post.id}` })
    expect(res.json<Post>()).toMatchObject({ isRemoved: true, body: '', url: null })
    expect((await del(author.cookie)).statusCode).toBe(404)
  })
})
