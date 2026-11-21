import { type Db, sql } from '@aced/db'
import type { JobDefinition } from '@aced/jobs'

/** Sets each user's karma to the summed score of their visible posts and comments. */
export async function refreshKarma(db: Db) {
  // shortcut: recomputes every user in one statement; switch to incremental updates at scale.
  const result = await db.execute(sql`
    with totals as (
      select author_id, sum(score)::int as karma
      from (
        select author_id, score from posts where not is_removed
        union all
        select author_id, score from comments where not is_removed
      ) scored
      where author_id is not null
      group by author_id
    )
    update users
    set karma = coalesce(totals.karma, 0)
    from users u
    left join totals on totals.author_id = u.id
    where users.id = u.id and users.karma is distinct from coalesce(totals.karma, 0)
  `)
  return { updated: result.count }
}

export function karmaJob(db: Db): JobDefinition {
  return { name: 'karma', repeat: { every: 60 * 60 * 1000 }, handler: () => refreshKarma(db) }
}
