import { and, type Db, eq, inArray, schema, sql } from '@aced/db'
import { JOBS, type JobDefinition } from '@aced/jobs'
import { hotScore } from '@aced/ranking'
import type { TransferCardData } from '@aced/types'

const { players, teams, posts, postTags, rumorStatus } = schema

export const ROSTER_CHANGED = JOBS.rosterChanged

export interface RosterChange {
  playerId: string
  fromTeamId: string | null
  toTeamId: string | null
}

/**
 * Posts a transfer card and flags open rumors tagged with the player and the new team so
 * moderators can confirm them.
 */
export async function createTransferPost(db: Db, change: RosterChange) {
  if (change.fromTeamId === change.toTeamId) return { skipped: true }
  const [player] = await db.select().from(players).where(eq(players.id, change.playerId))
  if (!player) return { skipped: true }
  const teamIds = [change.fromTeamId, change.toTeamId].filter((id): id is string => id !== null)
  const teamRows = teamIds.length
    ? await db.select().from(teams).where(inArray(teams.id, teamIds))
    : []
  const team = (id: string | null) => {
    const t = teamRows.find((r) => r.id === id)
    return t ? { name: t.name, tag: t.tag, slug: t.slug } : null
  }
  const from = team(change.fromTeamId)
  const to = team(change.toTeamId)
  const data: TransferCardData = {
    type: 'transfer',
    player: { handle: player.handle, slug: player.slug },
    from,
    to,
  }
  const title = to
    ? `${player.handle} joins ${to.name}${from ? ` from ${from.name}` : ''}`
    : `${player.handle} leaves ${from?.name ?? 'their team'}`
  const createdAt = new Date()

  return db.transaction(async (tx) => {
    // shortcut: keyed on the move only, so the same A→B move twice reuses one post; add the
    // effective date to the key once the GRID sync provides it.
    const [post] = await tx
      .insert(posts)
      .values({
        kind: 'transfer',
        sourceKey: `transfer:${player.id}:${change.fromTeamId ?? 'none'}:${change.toTeamId ?? 'none'}`,
        title,
        body: '',
        data,
        createdAt,
        hotScore: hotScore(0, createdAt),
      })
      .onConflictDoUpdate({
        target: posts.sourceKey,
        set: { title: sql`excluded.title`, data: sql`excluded.data`, updatedAt: sql`now()` },
      })
      .returning({ id: posts.id })
    if (!post) throw new Error('upsert returned no row')

    await tx
      .insert(postTags)
      .values([
        { postId: post.id, entityType: 'player' as const, entityId: player.id },
        ...teamIds.map((id) => ({ postId: post.id, entityType: 'team' as const, entityId: id })),
      ])
      .onConflictDoNothing()

    let matched = 0
    if (change.toTeamId) {
      const flagged = await tx
        .update(rumorStatus)
        .set({ matchedTransferId: post.id })
        .where(
          and(
            eq(rumorStatus.status, 'open'),
            sql`exists (select 1 from ${postTags} where ${postTags.postId} = ${rumorStatus.postId}
              and ${postTags.entityType} = 'player' and ${postTags.entityId} = ${player.id})`,
            sql`exists (select 1 from ${postTags} where ${postTags.postId} = ${rumorStatus.postId}
              and ${postTags.entityType} = 'team' and ${postTags.entityId} = ${change.toTeamId})`,
          ),
        )
        .returning({ postId: rumorStatus.postId })
      matched = flagged.length
    }
    return { postId: post.id, matchedRumors: matched }
  })
}

export function rosterChangedJob(db: Db): JobDefinition<RosterChange> {
  return { name: ROSTER_CHANGED, handler: (job) => createTransferPost(db, job.data) }
}
