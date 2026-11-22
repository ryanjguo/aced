import Link from 'next/link'
import { api } from '@/lib/api'
import { timeUntil } from '@/lib/time-ago'
import { RailCard, railItem } from './RailCard'

/** Live series, then scheduled ones in the next 48 hours by start time (5 at most). */
export async function LiveUpcoming() {
  const now = Date.now()
  // Live ones can have started hours ago, so they're fetched on their own.
  const [live, next] = await Promise.all([
    api.series({ status: 'live' }, { cache: 'no-store' }),
    api.series(
      { from: new Date(now).toISOString(), to: new Date(now + 48 * 3600_000).toISOString() },
      { cache: 'no-store' },
    ),
  ]).catch(() => [null, null])
  if (!live || !next) return null
  const items = [...live.items, ...next.items.filter((s) => s.status === 'scheduled')].slice(0, 5)

  return (
    <RailCard title="Live and upcoming" href="/matches">
      {items.length === 0 ? (
        <p className="py-1 text-meta text-muted">No matches in the next two days.</p>
      ) : (
        <ul>
          {items.map((s) => (
            <li key={s.id} className={railItem}>
              <Link
                href={`/matches/${s.id}`}
                className="flex items-center justify-between gap-2 text-[13px] hover:text-fg"
              >
                <span className="font-mono">
                  {s.teamA?.tag ?? 'TBD'} <span className="text-muted">vs</span>{' '}
                  {s.teamB?.tag ?? 'TBD'}
                </span>
                {s.status === 'live' ? (
                  <span className="font-mono font-semibold text-accent tabular-nums">
                    {s.score[0]}–{s.score[1]}
                  </span>
                ) : (
                  <span className="text-meta text-muted">in {timeUntil(s.scheduledAt, now)}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </RailCard>
  )
}
