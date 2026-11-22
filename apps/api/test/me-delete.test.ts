import { eq, schema } from '@aced/db'
import { afterAll, describe, expect, it } from 'vitest'
import { buildTestApp, createUser } from './build-test-app.js'

const { users, posts, comments, votes, follows, sessions, modActions } = schema

describe('export and delete my account', () => {
  const app = buildTestApp()
  const postIds: string[] = []

  afterAll(async () => {
    for (const id of postIds) await app.db.delete(posts).where(eq(posts.id, id))
    await app.close()
  })

  async function setup() {
    const me = await createUser(app, 'leaver')
    const other = await createUser(app, 'stayer')
    const [theirs] = await app.db
      .insert(posts)
      .values({ kind: 'take', body: 'their take', authorId: other.id, score: 1 })
      .returning()
    const [mine] = await app.db
      .insert(posts)
      .values({ kind: 'take', body: 'my take', authorId: me.id })
      .returning()
    postIds.push(theirs?.id ?? '', mine?.id ?? '')
    const [comment] = await app.db
      .insert(comments)
      .values({ postId: theirs?.id ?? '', body: 'my comment', authorId: me.id })
      .returning()
    await app.db
      .insert(votes)
      .values({ userId: me.id, targetType: 'post', targetId: theirs?.id ?? '', value: 1 })
    await app.db.insert(follows).values({ userId: me.id, targetType: 'user', targetId: other.id })
    return { me, other, theirs: theirs?.id ?? '', mine: mine?.id ?? '', comment: comment?.id ?? '' }
  }

  it('exports my account, posts, comments, votes and follows', async () => {
    const { me, other, theirs } = await setup()
    const res = await app.inject({
      method: 'GET',
      url: '/me/export',
      headers: { cookie: me.cookie },
    })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-disposition']).toMatch(/^attachment; filename="aced-leaver_/)
    const data = res.json()
    expect(data.account.handle).toMatch(/^leaver_/)
    expect(data.posts.map((p: { body: string }) => p.body)).toEqual(['my take'])
    expect(data.comments.map((c: { body: string }) => c.body)).toEqual(['my comment'])
    expect(data.votes).toMatchObject([{ targetType: 'post', targetId: theirs, value: 1 }])
    expect(data.follows).toMatchObject([{ targetType: 'user', targetId: other.id }])
    await app.db.delete(users).where(eq(users.id, me.id))
    await app.db.delete(users).where(eq(users.id, other.id))
  })

  it('requires the handle typed to confirm', async () => {
    const { me, other } = await setup()
    const res = await app.inject({
      method: 'DELETE',
      url: '/me',
      headers: { cookie: me.cookie },
      payload: { confirm: 'nope' },
    })
    expect(res.statusCode).toBe(400)
    expect(await app.db.$count(users, eq(users.id, me.id))).toBe(1)
    await app.db.delete(users).where(eq(users.id, me.id))
    await app.db.delete(users).where(eq(users.id, other.id))
  })

  it('deletes the account, keeps posts anonymised and fixes scores', async () => {
    const { me, other, theirs, mine, comment } = await setup()
    const [user] = await app.db.select().from(users).where(eq(users.id, me.id))
    const res = await app.inject({
      method: 'DELETE',
      url: '/me',
      headers: { cookie: me.cookie },
      payload: { confirm: user?.handle.toUpperCase() },
    })
    expect(res.statusCode).toBe(204)

    expect(await app.db.$count(users, eq(users.id, me.id))).toBe(0)
    expect(await app.db.$count(sessions, eq(sessions.userId, me.id))).toBe(0)
    expect(await app.db.$count(votes, eq(votes.userId, me.id))).toBe(0)
    expect(await app.db.$count(follows, eq(follows.userId, me.id))).toBe(0)
    const [myPost] = await app.db.select().from(posts).where(eq(posts.id, mine))
    expect(myPost).toMatchObject({ authorId: null, body: 'my take' })
    const [myComment] = await app.db.select().from(comments).where(eq(comments.id, comment))
    expect(myComment?.authorId).toBeNull()
    const [theirPost] = await app.db.select().from(posts).where(eq(posts.id, theirs))
    expect(theirPost?.score).toBe(0)
    expect(await app.db.$count(modActions, eq(modActions.targetId, me.id))).toBe(1)

    // The old session no longer works.
    const after = await app.inject({ method: 'GET', url: '/me', headers: { cookie: me.cookie } })
    expect(after.statusCode).toBe(401)
    await app.db.delete(modActions).where(eq(modActions.targetId, me.id))
    await app.db.delete(users).where(eq(users.id, other.id))
  })
})
