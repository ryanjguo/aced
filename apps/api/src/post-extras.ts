import { type Db, inArray, schema } from '@aced/db'
import type { PostTag, RumorStatus, VoteValue } from '@aced/types'
import { loadTags } from './tags.js'
import { myVotes } from './votes.js'

export interface PostExtras {
  myVote?: VoteValue
  tags?: PostTag[]
  rumorStatus?: RumorStatus | null
}

/** Per-post viewer vote, tags and rumor status for a page of posts, in a fixed number of queries. */
export async function loadPostExtras(
  db: Db,
  userId: string | undefined,
  postIds: string[],
): Promise<(postId: string) => PostExtras> {
  const { rumorStatus } = schema
  const [votes, tags, rumors] = await Promise.all([
    myVotes(db, userId, 'post', postIds),
    loadTags(db, postIds),
    postIds.length ? db.select().from(rumorStatus).where(inArray(rumorStatus.postId, postIds)) : [],
  ])
  const status = new Map(rumors.map((r) => [r.postId, r.status]))
  return (id) => ({
    myVote: votes.get(id),
    tags: tags.get(id),
    rumorStatus: status.get(id) ?? null,
  })
}
