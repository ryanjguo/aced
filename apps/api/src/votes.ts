import { and, type Db, eq, inArray, schema } from '@aced/db'
import type { VoteValue } from '@aced/types'

/** The user's votes on the given targets, keyed by target id. Empty when signed out. */
export async function myVotes(
  db: Db,
  userId: string | undefined,
  targetType: 'post' | 'comment',
  targetIds: string[],
): Promise<Map<string, VoteValue>> {
  if (!userId || targetIds.length === 0) return new Map()
  const { votes } = schema
  const rows = await db
    .select({ targetId: votes.targetId, value: votes.value })
    .from(votes)
    .where(
      and(
        eq(votes.userId, userId),
        eq(votes.targetType, targetType),
        inArray(votes.targetId, targetIds),
      ),
    )
  return new Map(rows.map((r) => [r.targetId, r.value as VoteValue]))
}
