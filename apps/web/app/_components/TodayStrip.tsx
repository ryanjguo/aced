import type { Series } from '@aced/types'
import Link from 'next/link'
import { api } from '@/lib/api'
import { getTimeZone, startOfToday } from '@/lib/time-zone'

const rank = (s: Series) => (s.status === 'live' ? 0 : 1)

/** Home "Today" strip: live series first, then today's by start time. Hidden when empty. */
export async function TodayStrip() {
  const tz = await getTimeZone()
  const from = startOfToday(tz)
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000)
  const [today, live] = await Promise.all([
    api.series({ from: from.toISOString(), to: to.toISOString() }, { cache: 'no-store' }),
    api.series({ status: 'live' }, { cache: 'no-store' }),
  ]).catch(() => [null, null])
  const byId = new Map([...(live?.items ?? []), ...(today?.items ?? [])].map((s) => [s.id, s]))
  const items = [...byId.values()]
    .filter((s) => s.status !== 'cancelled')
    .sort((a, b) => rank(a) - rank(b) || a.scheduledAt.localeCompare(b.scheduledAt))
  if (items.length === 0) return null
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <section aria-labelledby="today-heading" className="flex flex-col gap-2">
      <h2 id="today-heading" className="text-rail-heading">
        Today
      </h2>
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {items.map((s) => (
          <li key={s.id} className="shrink-0">
            <Link
              href={`/matches/${s.id}`}
              className="flex min-w-[150px] flex-col gap-1 rounded-md border border-border bg-surface px-3 py-2 transition-colors hover:bg-surface-2"
            >
              <span className="flex items-center justify-between gap-2 text-badge text-muted">
                <span className="max-w-[110px] truncate">{s.event.name}</span>
                {s.status === 'live' && (
                  <span className="inline-flex items-center gap-1 font-semibold text-accent">
                    <span className="size-1.5 animate-pulse rounded-full bg-accent" />
                    LIVE
                  </span>
                )}
              </span>
              <span className="flex items-center gap-2 font-mono text-[13px] tabular-nums">
                <span>{s.teamA?.tag ?? 'TBD'}</span>
                <span className={s.status === 'live' ? 'text-accent' : 'text-muted'}>
                  {s.status === 'scheduled'
                    ? time.format(new Date(s.scheduledAt))
                    : `${s.score[0]}–${s.score[1]}`}
                </span>
                <span>{s.teamB?.tag ?? 'TBD'}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
