import { createDb, eq, inArray, like, schema } from '@aced/db'
import type { TransferCardData } from '@aced/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTransferPost } from '../src/jobs/roster-changed.js'
import { createEsportsFixture, type EsportsFixture } from './fixtures.js'

const url = process.env.DATABASE_URL
const { posts, postTags, rumorStatus } = schema

describe.skipIf(!url)('roster-changed job', () => {
  const db = createDb(url ?? '', { max: 1 })
  const created: string[] = []
  let playerId = ''
  let fx: EsportsFixture | undefined

  beforeAll(async () => {
    fx = await createEsportsFixture(db)
  })
  afterAll(async () => {
    await db.delete(posts).where(inArray(posts.id, created))
    if (playerId) await db.delete(posts).where(like(posts.sourceKey, `transfer:${playerId}:%`))
    await fx?.cleanup()
    await db.$client.end()
  })

  const rumorAbout = async (player: string, team: string) => {
    const [p] = await db
      .insert(posts)
      .values({ kind: 'rumor', title: 'r', url: 'https://x.dev' })
      .returning()
    const id = p?.id ?? ''
    created.push(id)
    await db.insert(rumorStatus).values({ postId: id })
    await db.insert(postTags).values([
      { postId: id, entityType: 'player', entityId: player },
      { postId: id, entityType: 'team', entityId: team },
    ])
    return id
  }

  it('posts one tagged transfer card and flags matching open rumors', async () => {
    if (!fx) throw new Error('fixture missing')
    const { b: from, c: to } = fx.teams
    const [player] = fx.roster(from.id)
    if (!player) throw new Error('fixture missing')
    playerId = player.id
    const matching = await rumorAbout(player.id, to.id)
    const other = await rumorAbout(player.id, from.id)

    const change = { playerId: player.id, fromTeamId: from.id, toTeamId: to.id }
    const first = await createTransferPost(db, change)
    await createTransferPost(db, change)

    const transfers = await db
      .select()
      .from(posts)
      .where(like(posts.sourceKey, `transfer:${player.id}:%`))
    expect(transfers).toHaveLength(1)
    expect(transfers[0]?.title).toBe(`${player.handle} joins ${to.name} from ${from.name}`)
    expect((transfers[0]?.data as TransferCardData | undefined)?.to?.slug).toBe(to.slug)
    const tags = await db
      .select()
      .from(postTags)
      .where(eq(postTags.postId, transfers[0]?.id ?? ''))
    expect(tags).toHaveLength(3)

    expect(first).toMatchObject({ matchedRumors: 1 })
    const [m] = await db.select().from(rumorStatus).where(eq(rumorStatus.postId, matching))
    const [o] = await db.select().from(rumorStatus).where(eq(rumorStatus.postId, other))
    expect(m?.matchedTransferId).toBe(transfers[0]?.id)
    expect(o?.matchedTransferId).toBeNull()
  })
  it('ignores a move to the same team', async () => {
    const team = fx?.teams.c.id ?? null
    const change = { playerId, fromTeamId: team, toTeamId: team }
    expect(await createTransferPost(db, change)).toEqual({ skipped: true })
  })
})
