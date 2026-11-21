import { ApiClientError } from '@aced/api-client'
import type { SeriesDetail, Team } from '@aced/types'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { api } from '@/lib/api'
import { getTimeZone } from '@/lib/time-zone'
import { AdminSeriesFix } from './_components/AdminSeriesFix'
import { LocalTime } from './_components/LocalTime'
import { StatsTable } from './_components/StatsTable'

type Props = { params: Promise<{ id: string }> }

// Shared by generateMetadata and the page so the API is called once per request.
const getSeries = cache(async (id: string): Promise<SeriesDetail | 'not_found' | null> => {
  try {
    return await api.seriesById(id, { cache: 'no-store' })
  } catch (err) {
    if (err instanceof ApiClientError && (err.status === 404 || err.status === 400)) {
      return 'not_found'
    }
    return null
  }
})

const tag = (team: Team | null) => team?.tag ?? 'TBD'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const series = await getSeries((await params).id)
  if (!series || series === 'not_found') return { title: 'Match' }
  const middle = series.status === 'scheduled' ? 'vs' : `${series.score[0]}–${series.score[1]}`
  return { title: `${tag(series.teamA)} ${middle} ${tag(series.teamB)} · ${series.event.name}` }
}

function TeamName({ team, won }: { team: Team | null; won: boolean }) {
  return (
    <p className={`min-w-0 flex-1 truncate text-lg font-semibold ${won ? '' : 'text-fg/80'}`}>
      {team ? (
        <Link href={`/teams/${team.slug}`} className="hover:underline">
          <span className="sm:hidden">{team.tag}</span>
          <span className="hidden sm:inline">{team.name}</span>
        </Link>
      ) : (
        <span className="text-muted">TBD</span>
      )}
    </p>
  )
}

export default async function SeriesPage({ params }: Props) {
  const series = await getSeries((await params).id)
  if (series === 'not_found') notFound()
  if (!series) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p role="alert" className="py-12 text-center text-sm text-muted">
          Couldn't load this match. Try again in a moment.
        </p>
      </main>
    )
  }

  const { teamA, teamB, status, score, winnerId } = series

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <Link href={`/events/${series.event.slug}`} className="hover:text-fg">
            {series.event.name}
          </Link>
          {status === 'live' ? (
            <span className="inline-flex items-center gap-1 font-semibold text-live">
              <span className="size-1.5 animate-pulse rounded-full bg-live" />
              LIVE
            </span>
          ) : (
            <LocalTime iso={series.scheduledAt} timeZone={await getTimeZone()} />
          )}
        </div>
        <div className="flex items-center gap-4">
          <TeamName team={teamA} won={winnerId === null || winnerId === teamA?.id} />
          <p className="shrink-0 text-center font-mono text-2xl tabular-nums">
            {status === 'scheduled' ? (
              <span className="text-sm text-muted">Bo{series.bestOf}</span>
            ) : (
              `${score[0]} : ${score[1]}`
            )}
          </p>
          <div className="flex min-w-0 flex-1 justify-end text-right">
            <TeamName team={teamB} won={winnerId === null || winnerId === teamB?.id} />
          </div>
        </div>
      </header>

      <AdminSeriesFix series={series} />

      {series.maps.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          {status === 'scheduled' ? "This match hasn't started yet." : 'No map data yet.'}
        </p>
      ) : (
        series.maps.map((map) => (
          <section
            key={map.id}
            aria-label={`Map ${map.order}: ${map.mapName}`}
            className="overflow-hidden rounded-lg border border-border bg-surface"
          >
            <h2 className="flex items-center justify-between border-b border-border px-4 py-3 text-sm">
              <span>
                <span className="text-muted">Map {map.order} · </span>
                <span className="font-semibold">{map.mapName}</span>
              </span>
              <span className="font-mono tabular-nums">
                {map.score[0]} : {map.score[1]}
                {map.winnerId === null && <span className="ml-2 text-xs text-live">LIVE</span>}
              </span>
            </h2>
            {map.stats.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted">
                Stats appear when the map ends.
              </p>
            ) : (
              [teamA, teamB].map(
                (team) =>
                  team && (
                    <StatsTable
                      key={team.id}
                      team={team}
                      stats={map.stats.filter((s) => s.teamId === team.id)}
                    />
                  ),
              )
            )}
          </section>
        ))
      )}
    </main>
  )
}
