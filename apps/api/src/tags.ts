import { type Db, eq, inArray, schema, type Tx } from '@aced/db'
import type { PostTag, TagEntityType } from '@aced/types'
import { z } from 'zod'
import { HttpError } from './errors.js'

const { postTags, players, teams, events } = schema

export const MAX_TAGS = 10

export const tagsInput = z
  .array(z.object({ type: z.enum(['player', 'team', 'event']), id: z.uuid() }))
  .max(MAX_TAGS)

/** Tags for each post, with display names, in at most four queries. */
export async function loadTags(db: Db, postIds: string[]): Promise<Map<string, PostTag[]>> {
  const result = new Map<string, PostTag[]>()
  if (postIds.length === 0) return result
  const rows = await db.select().from(postTags).where(inArray(postTags.postId, postIds))
  const ids = (type: TagEntityType) =>
    rows.filter((r) => r.entityType === type).map((r) => r.entityId)

  const [playerRows, teamRows, eventRows] = await Promise.all([
    ids('player').length
      ? db
          .select({ id: players.id, name: players.handle, slug: players.slug })
          .from(players)
          .where(inArray(players.id, ids('player')))
      : [],
    ids('team').length
      ? db
          .select({ id: teams.id, name: teams.name, slug: teams.slug })
          .from(teams)
          .where(inArray(teams.id, ids('team')))
      : [],
    ids('event').length
      ? db
          .select({ id: events.id, name: events.name, slug: events.slug })
          .from(events)
          .where(inArray(events.id, ids('event')))
      : [],
  ])
  const names = { player: playerRows, team: teamRows, event: eventRows }

  for (const row of rows) {
    const entity = names[row.entityType].find((e) => e.id === row.entityId)
    if (!entity) continue
    const list = result.get(row.postId) ?? []
    list.push({ type: row.entityType, ...entity })
    result.set(row.postId, list)
  }
  return result
}

/** Replaces a post's tags; 400 if any tagged entity doesn't exist. */
export async function saveTags(tx: Tx, postId: string, tags: z.infer<typeof tagsInput>) {
  const unique = [...new Map(tags.map((t) => [`${t.type}:${t.id}`, t])).values()]
  for (const type of ['player', 'team', 'event'] as const) {
    const wanted = unique.filter((t) => t.type === type).map((t) => t.id)
    if (wanted.length === 0) continue
    const table = { player: players, team: teams, event: events }[type]
    const found = await tx.select({ id: table.id }).from(table).where(inArray(table.id, wanted))
    if (found.length !== wanted.length)
      throw new HttpError(400, 'bad_request', `Unknown ${type} tag`)
  }
  await tx.delete(postTags).where(eq(postTags.postId, postId))
  if (unique.length) {
    await tx
      .insert(postTags)
      .values(unique.map((t) => ({ postId, entityType: t.type, entityId: t.id })))
  }
}
