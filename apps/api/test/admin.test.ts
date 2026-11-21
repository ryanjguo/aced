import { randomUUID } from 'node:crypto'
import { eq, inArray, schema } from '@aced/db'
import { JOBS } from '@aced/jobs'
import type { UserRole } from '@aced/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildTestApp, redisReady, signIn } from './build-test-app.js'

const { users, series, posts, modActions } = schema

// Corrects a `pnpm db:seed` series and restores it afterwards.
describe('admin corrections', () => {
  const app = buildTestApp()
  const ids: string[] = []
  const cookies: Partial<Record<UserRole, string>> = {}
  let original: typeof series.$inferSelect | undefined
  let resultPostId = ''

  beforeAll(async () => {
    await redisReady(app)
    for (const role of ['admin', 'moderator'] as const) {
      const handle = `adm_${randomUUID().slice(0, 8)}`
      const [u] = await app.db
        .insert(users)
        .values({ name: handle, email: `${handle}@test.dev`, handle, role })
        .returning()
      ids.push(u?.id ?? '')
      cookies[role] = (await signIn(app, u?.id ?? '')).cookie
    }
    ;[original] = await app.db.select().from(series).where(eq(series.gridId, 'seed-series-2'))
    const [post] = await app.db
      .insert(posts)
      .values({
        kind: 'result',
        title: 'r',
        sourceKey: `result:${original?.id}:test-${randomUUID()}`,
      })
      .returning()
    resultPostId = post?.id ?? ''
    await app.jobs.queue(JOBS.seriesCompleted).drain()
  })

  afterAll(async () => {
    if (original) {
      const { id, scoreA, scoreB, status, winnerId } = original
      await app.db
        .update(series)
        .set({ scoreA, scoreB, status, winnerId, manualOverride: false })
        .where(eq(series.id, id))
      await app.db.delete(modActions).where(eq(modActions.targetId, id))
    }
    await app.db.delete(posts).where(eq(posts.id, resultPostId))
    await app.jobs.queue(JOBS.seriesCompleted).drain()
    await app.db.delete(users).where(inArray(users.id, ids))
    await app.close()
  })

  const fix = (cookie: string | undefined, body: object) =>
    app.inject({
      method: 'PATCH',
      url: `/admin/series/${original?.id}`,
      headers: { cookie: cookie ?? '' },
      payload: body,
    })

  it('fixes a series, marks the override, logs it and refreshes the cards', async () => {
    const body = {
      scoreA: 2,
      scoreB: 1,
      status: 'completed',
      winner: 'a',
      reason: 'Official correction',
    }
    expect((await fix(cookies.moderator, body)).statusCode).toBe(403)
    expect((await fix(cookies.admin, body)).statusCode).toBe(204)

    const [row] = await app.db
      .select()
      .from(series)
      .where(eq(series.id, original?.id ?? ''))
    expect(row).toMatchObject({
      scoreA: 2,
      scoreB: 1,
      manualOverride: true,
      winnerId: row?.teamAId,
    })
    const [log] = await app.db
      .select()
      .from(modActions)
      .where(eq(modActions.targetId, row?.id ?? ''))
    expect(log).toMatchObject({
      action: 'fix_series',
      targetType: 'series',
      reason: 'Official correction',
    })
    const waiting = await app.jobs.queue(JOBS.seriesCompleted).getWaiting()
    expect(waiting.some((j) => j.data.seriesId === row?.id)).toBe(true)
  })

  it('rejects a winner on an unfinished series', async () => {
    const res = await fix(cookies.admin, {
      scoreA: 0,
      scoreB: 0,
      status: 'live',
      winner: 'a',
      reason: 'x',
    })
    expect(res.statusCode).toBe(400)
  })

  it('regenerates generated posts only', async () => {
    const regen = (id: string) =>
      app.inject({
        method: 'POST',
        url: `/admin/posts/${id}/regenerate`,
        headers: { cookie: cookies.admin ?? '' },
      })
    expect((await regen(resultPostId)).statusCode).toBe(202)
    const [userPost] = await app.db.insert(posts).values({ kind: 'take', body: 'mine' }).returning()
    expect((await regen(userPost?.id ?? '')).statusCode).toBe(400)
    await app.db.delete(posts).where(eq(posts.id, userPost?.id ?? ''))
  })
})
