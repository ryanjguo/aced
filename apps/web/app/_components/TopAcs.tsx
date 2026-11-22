import Link from 'next/link'
import { api, esportsCache } from '@/lib/api'
import { RailCard, railItem } from './RailCard'

/** Top average ACS over the last 7 days (2+ maps). */
export async function TopAcs() {
  const leaders = await api.acsLeaders(esportsCache).catch(() => null)
  if (!leaders) return null
  return (
    <RailCard title="Top ACS this week">
      {leaders.items.length === 0 ? (
        <p className="py-1 text-meta text-muted">No maps played this week.</p>
      ) : (
        <ol>
          {leaders.items.map((l) => (
            <li key={l.player.slug} className={`${railItem} flex items-center gap-2 text-[13px]`}>
              <span className="w-4 font-mono text-muted tabular-nums">{l.rank}</span>
              <Link
                href={`/players/${l.player.slug}`}
                className="min-w-0 flex-1 truncate hover:underline"
              >
                {l.player.handle}
                {l.team && (
                  <span className="ml-1.5 font-mono text-xs text-muted">{l.team.tag}</span>
                )}
              </Link>
              <span className="font-mono tabular-nums">{l.acs}</span>
            </li>
          ))}
        </ol>
      )}
    </RailCard>
  )
}
