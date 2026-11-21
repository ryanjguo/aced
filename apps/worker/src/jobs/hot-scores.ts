import { type Db, sql } from '@aced/db'
import type { JobDefinition } from '@aced/jobs'
import { HOT_DECAY_SECONDS, HOT_EPOCH_SECONDS } from '@aced/ranking'

/** Recomputes hot_score for the last 7 days of posts in one statement (mirrors `hotScore`). */
export async function refreshHotScores(db: Db) {
  const result = await db.execute(sql`
    update posts
    set hot_score = sign(score) * log(greatest(abs(score), 1))
      + (extract(epoch from created_at) - ${HOT_EPOCH_SECONDS}) / ${HOT_DECAY_SECONDS}
    where created_at > now() - interval '7 days'
  `)
  return { updated: result.count }
}

export function hotScoresJob(db: Db): JobDefinition {
  return {
    name: 'hot-scores',
    repeat: { every: 5 * 60 * 1000 },
    handler: () => refreshHotScores(db),
  }
}
