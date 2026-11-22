import type { EntityResult } from '@aced/types'
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
})
