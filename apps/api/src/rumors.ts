import { type Db, sql } from '@aced/db'
import type { RumorStats } from '@aced/types'

/**
 * A user's rumor record. A move is a (player, team) pair from a rumor's tags; among confirmed
 * rumors on the same move, the earliest earns full credit and later ones half.
 */
export async function rumorStats(db: Db, userId: string): Promise<RumorStats> {
  const result = await db.execute<{
    posted: number
    confirmed: number
    denied: number
    credit: number
  }>(sql`
    with confirmed_moves as (
      select p.id, p.author_id, p.created_at, pl.entity_id as player_id, tm.entity_id as team_id
      from posts p
      join rumor_status rs on rs.post_id = p.id and rs.status = 'confirmed'
      left join post_tags pl on pl.post_id = p.id and pl.entity_type = 'player'
      left join post_tags tm on tm.post_id = p.id and tm.entity_type = 'team'
      where not p.is_removed
    ),
    firsts as (
      select distinct on (player_id, team_id) id
      from confirmed_moves
      order by player_id, team_id, created_at, id
    ),
    mine as (
      select distinct id, (id in (select id from firsts)) as first
      from confirmed_moves where author_id = ${userId}
    )
    select
      (select count(*)::int from posts p join rumor_status rs on rs.post_id = p.id
        where p.author_id = ${userId} and not p.is_removed) as posted,
      (select count(*)::int from posts p join rumor_status rs on rs.post_id = p.id
        where p.author_id = ${userId} and not p.is_removed and rs.status = 'confirmed') as confirmed,
      (select count(*)::int from posts p join rumor_status rs on rs.post_id = p.id
        where p.author_id = ${userId} and not p.is_removed and rs.status = 'denied') as denied,
      (select coalesce(sum(case when first then 1 else 0.5 end), 0)::float from mine) as credit
  `)
  const row = result[0] ?? { posted: 0, confirmed: 0, denied: 0, credit: 0 }
  const resolved = row.confirmed + row.denied
  return { ...row, accuracy: resolved ? row.confirmed / resolved : null }
}
