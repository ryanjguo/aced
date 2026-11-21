import { randomUUID } from 'node:crypto'
import { eq, schema, sql } from '@aced/db'
import type { BoardList, Page, Post } from '@aced/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildTestApp } from './build-test-app.js'

const { boards, posts } = schema

describe('boards', () => {
  const app = buildTestApp()
  const slug = `test-${randomUUID().slice(0, 8)}`
  let boardId = ''

  beforeAll(async () => {
    const [board] = await app.db.insert(boards).values({ slug, name: 'Test board' }).returning()
    boardId = board?.id ?? ''
    // 60 posts with lots of ties, sharing one created_at, so pagination must tiebreak on id.
    await app.db.insert(posts).values(
      Array.from({ length: 60 }, (_, i) => ({
        kind: 'thread' as const,
        boardId,
        title: `Post ${i}`,
        hotScore: i % 7,
        score: i % 5,
      })),
    )
    await app.db.insert(posts).values([
      { kind: 'thread', boardId, title: 'Removed', hotScore: 100, isRemoved: true },
      {
        kind: 'thread',
        boardId,
        title: 'Old',
        score: 1000,
        createdAt: sql`now() - interval '30 days'`,
      },
    ])
  })

  afterAll(async () => {
    await app.db.delete(posts).where(eq(posts.boardId, boardId))
    await app.db.delete(boards).where(eq(boards.id, boardId))
    await app.close()
  })

  const allPages = async (query: string) => {
    const items: Post[] = []
    let cursor: string | null = null
    do {
      const qs: string = cursor ? `${query}&cursor=${cursor}` : query
      const res = await app.inject({ method: 'GET', url: `/boards/${slug}/posts?${qs}` })
      expect(res.statusCode).toBe(200)
      const page = res.json<Page<Post>>()
      expect(page.items.length).toBeLessThanOrEqual(25)
      items.push(...page.items)
      cursor = page.nextCursor
    } while (cursor)
    return items
  }

  it('lists boards in order', async () => {
    const { items } = (await app.inject({ method: 'GET', url: '/boards' })).json<BoardList>()
    expect(items.map((b) => b.slug)).toContain('general')
    expect(items.map((b) => b.slug)).toContain(slug)
  })

  it.each(['hot', 'new', 'top'])('pages %s posts without gaps or duplicates', async (sort) => {
    const items = await allPages(`sort=${sort}&t=all`)
    expect(items).toHaveLength(61)
    expect(new Set(items.map((p) => p.id)).size).toBe(61)
    expect(items.some((p) => p.title === 'Removed')).toBe(false)
  })

  it('orders hot posts by hot score', async () => {
    const items = await allPages('sort=hot')
    expect(items[0]?.title).not.toBe('Removed')
    const titles = items.map((p) => Number(p.title?.split(' ')[1]) % 7)
    expect(titles.filter((n) => !Number.isNaN(n))).toEqual(
      [...titles].filter((n) => !Number.isNaN(n)).sort((a, b) => b - a),
    )
  })

  it('limits top posts to the time window', async () => {
    const week = await allPages('sort=top&t=week')
    expect(week.some((p) => p.title === 'Old')).toBe(false)
    const all = await allPages('sort=top&t=all')
    expect(all[0]?.title).toBe('Old')
  })

  it('rejects a bad cursor and unknown boards', async () => {
    const bad = await app.inject({ method: 'GET', url: `/boards/${slug}/posts?cursor=nope` })
    expect(bad.statusCode).toBe(400)
    const missing = await app.inject({ method: 'GET', url: '/boards/nope-nope/posts' })
    expect(missing.statusCode).toBe(404)
  })
})
