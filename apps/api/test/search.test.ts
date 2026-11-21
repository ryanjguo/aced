import { schema, sql } from '@aced/db'
import type { EntityResult, Page, Post } from '@aced/types'
import { afterAll, describe, expect, it } from 'vitest'
import { buildTestApp } from './build-test-app.js'

// Runs against `pnpm db:seed` data.
describe('entity search', () => {
  const app = buildTestApp()
  afterAll(() => app.close())

  const search = async (qs: string) => {
    const res = await app.inject({ method: 'GET', url: `/search/entities?${qs}` })
    return { status: res.statusCode, items: res.json<{ items: EntityResult[] }>().items }
  }

  it('finds players by prefix with their team', async () => {
    const { items } = await search('q=kes')
    expect(items[0]).toMatchObject({
      type: 'player',
      name: 'Kestrel',
      slug: 'kestrel',
      detail: 'NW',
    })
  })

  it('finds teams by name or tag', async () => {
    expect((await search('q=north&types=team')).items[0]).toMatchObject({ name: 'Northwind' })
    expect((await search('q=SVL&types=team')).items[0]).toMatchObject({ name: 'Silverline' })
  })

  it('finds events by a word inside the name', async () => {
    const { items } = await search('q=americas&types=event')
    expect(items.map((i) => i.slug).sort()).toEqual([
      'kickoff-2027-americas',
      'stage-1-2027-americas',
    ])
  })

  it('tolerates typos', async () => {
    const { items } = await search('q=kestrl&types=player')
    expect(items[0]?.name).toBe('Kestrel')
  })

  it('caps results at 8', async () => {
    const { items } = await search('q=e')
    expect(items.length).toBeLessThanOrEqual(8)
  })

  it('treats LIKE wildcards literally', async () => {
    expect((await search('q=%25')).items).toEqual([])
  })

  it('validates input', async () => {
    expect((await search('q=')).status).toBe(400)
    expect((await search('q=x&types=coach')).status).toBe(400)
  })
  it('finds posts by full text, best match first', async () => {
    const res = await app.inject({ method: 'GET', url: '/search/posts?q=power rankings' })
    const { items } = res.json<Page<Post>>()
    expect(items[0]?.title).toBe('Stage 1 power rankings, week 2')
    const stemmed = await app.inject({ method: 'GET', url: '/search/posts?q=ranking' })
    expect(stemmed.json<Page<Post>>().items.map((p) => p.title)).toContain(
      'Stage 1 power rankings, week 2',
    )
  })

  it('pages post results without duplicates', async () => {
    const run = crypto.randomUUID().slice(0, 8)
    const word = `zyx${run}`
    const { posts } = schema
    await app.db
      .insert(posts)
      .values(
        Array.from({ length: 30 }, (_, i) => ({ kind: 'take' as const, body: `${word} ${i}` })),
      )
    const first = (await app.inject({ method: 'GET', url: `/search/posts?q=${word}` })).json<
      Page<Post>
    >()
    const second = (
      await app.inject({ method: 'GET', url: `/search/posts?q=${word}&cursor=${first.nextCursor}` })
    ).json<Page<Post>>()
    const ids = [...first.items, ...second.items].map((p) => p.id)
    expect(ids).toHaveLength(30)
    expect(new Set(ids).size).toBe(30)
    await app.db.delete(posts).where(sql`${posts.body} like ${`${word}%`}`)
  })
})
