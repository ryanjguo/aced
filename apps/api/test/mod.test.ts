import { randomUUID } from 'node:crypto'
import { and, eq, inArray, schema } from '@aced/db'
import type { CommentNode, ModQueueItem, Page, Post, UserRole } from '@aced/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildTestApp, signIn } from './build-test-app.js'

const { users, posts, comments, reports, modActions } = schema

describe('moderation', () => {
  const app = buildTestApp()
  const userIds: string[] = []
  let mod = ''
  let member = ''
  let memberId = ''

  const createUser = async (role: UserRole = 'user') => {
    const run = randomUUID().slice(0, 8)
    const [user] = await app.db
      .insert(users)
      .values({ name: run, email: `${run}@test.dev`, handle: `mod_${run}`, role })
      .returning()
    if (!user) throw new Error('insert failed')
    userIds.push(user.id)
    return { id: user.id, cookie: (await signIn(app, user.id)).cookie }
  }

  const act = (payload: object, cookie = mod) =>
    app.inject({ method: 'POST', url: '/mod/actions', headers: { cookie }, payload })

  const newPost = async () =>
    (
      await app.inject({
        method: 'POST',
        url: '/posts',
        headers: { cookie: member },
        payload: { kind: 'take', body: 'Spammy' },
      })
    ).json<Post>()

  const report = (targetType: string, targetId: string) =>
    app.inject({
      method: 'POST',
      url: '/reports',
      headers: { cookie: member },
      payload: { targetType, targetId, reason: 'spam', note: 'buy now' },
    })

  beforeAll(async () => {
    mod = (await createUser('moderator')).cookie
    const m = await createUser()
    member = m.cookie
    memberId = m.id
  })

  afterAll(async () => {
    await app.db.delete(posts).where(inArray(posts.authorId, userIds))
    await app.db.delete(modActions).where(inArray(modActions.targetId, userIds))
    await app.db.delete(users).where(inArray(users.id, userIds))
    await app.close()
  })

  it('is moderator-only', async () => {
    expect((await app.inject({ method: 'GET', url: '/mod/reports' })).statusCode).toBe(401)
    const res = await app.inject({
      method: 'GET',
      url: '/mod/reports',
      headers: { cookie: member },
    })
    expect(res.statusCode).toBe(403)
    expect(
      (await act({ action: 'dismiss', targetType: 'user', targetId: memberId }, member)).statusCode,
    ).toBe(403)
  })

  it('lists reported content with a full preview', async () => {
    const post = await newPost()
    await report('post', post.id)
    const res = await app.inject({ method: 'GET', url: '/mod/reports', headers: { cookie: mod } })
    const item = res.json<Page<ModQueueItem>>().items.find((i) => i.targetId === post.id)
    expect(item).toMatchObject({
      targetType: 'post',
      reportCount: 1,
      reasons: ['spam'],
      notes: ['buy now'],
      preview: { body: 'Spammy', isRemoved: false },
    })
  })

  it('removes and restores a post, closing reports and logging both', async () => {
    const post = await newPost()
    await report('post', post.id)
    expect(
      (await act({ action: 'remove', targetType: 'post', targetId: post.id })).statusCode,
    ).toBe(400)
    const res = await act({
      action: 'remove',
      targetType: 'post',
      targetId: post.id,
      reason: 'spam',
    })
    expect(res.statusCode).toBe(201)

    const [row] = await app.db.select().from(posts).where(eq(posts.id, post.id))
    expect(row?.isRemoved).toBe(true)
    const open = await app.db
      .select()
      .from(reports)
      .where(and(eq(reports.targetId, post.id), eq(reports.status, 'open')))
    expect(open).toHaveLength(0)

    await act({ action: 'restore', targetType: 'post', targetId: post.id })
    const [restored] = await app.db.select().from(posts).where(eq(posts.id, post.id))
    expect(restored?.isRemoved).toBe(false)
    const log = await app.db.select().from(modActions).where(eq(modActions.targetId, post.id))
    expect(log.map((l) => l.action).sort()).toEqual(['remove', 'restore'])
    expect(log.find((l) => l.action === 'remove')?.reason).toBe('spam')
  })

  it('keeps comment_count right when removing and restoring comments', async () => {
    const post = await newPost()
    const comment = (
      await app.inject({
        method: 'POST',
        url: `/posts/${post.id}/comments`,
        headers: { cookie: member },
        payload: { body: 'hmm' },
      })
    ).json<CommentNode>()
    const count = async () =>
      (await app.db.select().from(posts).where(eq(posts.id, post.id)))[0]?.commentCount
    await act({ action: 'remove', targetType: 'comment', targetId: comment.id, reason: 'rude' })
    expect(await count()).toBe(0)
    await act({ action: 'remove', targetType: 'comment', targetId: comment.id, reason: 'again' })
    expect(await count()).toBe(0)
    await act({ action: 'restore', targetType: 'comment', targetId: comment.id })
    expect(await count()).toBe(1)
    const [row] = await app.db.select().from(comments).where(eq(comments.id, comment.id))
    expect(row?.isRemoved).toBe(false)
  })

  it('locks and unlocks posts only', async () => {
    const post = await newPost()
    await act({ action: 'lock', targetType: 'post', targetId: post.id })
    const [row] = await app.db.select().from(posts).where(eq(posts.id, post.id))
    expect(row?.isLocked).toBe(true)
    expect((await act({ action: 'lock', targetType: 'user', targetId: memberId })).statusCode).toBe(
      400,
    )
  })

  it('bans users from writing but not reading, then unbans', async () => {
    const target = await createUser()
    const until = new Date(Date.now() + 86_400_000).toISOString()
    expect(
      (await act({ action: 'ban', targetType: 'user', targetId: target.id, reason: 'x' }))
        .statusCode,
    ).toBe(400)
    await act({ action: 'ban', targetType: 'user', targetId: target.id, reason: 'spam', until })

    const write = () =>
      app.inject({
        method: 'POST',
        url: '/posts',
        headers: { cookie: target.cookie },
        payload: { kind: 'take', body: 'let me in' },
      })
    const banned = await write()
    expect(banned.statusCode).toBe(403)
    expect(banned.json()).toMatchObject({ error: { code: 'banned' } })
    expect(
      (await app.inject({ method: 'GET', url: '/me', headers: { cookie: target.cookie } }))
        .statusCode,
    ).toBe(200)

    await act({ action: 'unban', targetType: 'user', targetId: target.id })
    expect((await write()).statusCode).toBe(201)
  })

  it('dismisses reports, removing the item from the queue', async () => {
    const post = await newPost()
    await report('post', post.id)
    await act({ action: 'dismiss', targetType: 'post', targetId: post.id })
    const res = await app.inject({ method: 'GET', url: '/mod/reports', headers: { cookie: mod } })
    expect(res.json<Page<ModQueueItem>>().items.some((i) => i.targetId === post.id)).toBe(false)
    const [r] = await app.db.select().from(reports).where(eq(reports.targetId, post.id))
    expect(r?.status).toBe('dismissed')
  })
})
