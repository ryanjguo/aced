import { ApiClientError } from '@aced/api-client'
import type { PlayerDetail } from '@aced/types'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { FollowButton } from '@/components/FollowButton'
import { api } from '@/lib/api'
import { getTimeZone } from '@/lib/time-zone'
import { Discussion } from '../../_components/Discussion'

type Props = { params: Promise<{ slug: string }> }

const getPlayer = cache(async (slug: string): Promise<PlayerDetail | 'not_found' | null> => {
  try {
    return await api.player(slug, { cache: 'no-store' })
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) return 'not_found'
    return null
  }
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const player = await getPlayer((await params).slug)
  if (!player || player === 'not_found') return { title: 'Player' }
  return {
    title: player.team ? `${player.handle} (${player.team.tag})` : player.handle,
    description: `${player.handle}'s recent maps and stats.`,
  }
}

/** Regional indicator letters render as the country's flag. */
const flag = (country: string) =>
  String.fromCodePoint(...[...country.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)))

const fixed = (n: number | null, digits = 0) => (n === null ? '–' : n.toFixed(digits))

export default async function PlayerPage({ params }: Props) {
  const [player, timeZone] = await Promise.all([getPlayer((await params).slug), getTimeZone()])
  if (player === 'not_found') notFound()
  if (!player) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p role="alert" className="py-12 text-center text-sm text-muted">
          Couldn't load this player. Try again in a moment.
        </p>
      </main>
    )
  }

  const day = new Intl.DateTimeFormat('en-US', { timeZone, month: 'short', day: 'numeric' })
  const avg = player.averages
  const tiles = [
    ['ACS', fixed(avg?.acs ?? null)],
    ['K/D', fixed(avg?.kd ?? null, 2)],
    ['ADR', fixed(avg?.adr ?? null)],
    ['FK / map', fixed(avg?.firstKillsPerMap ?? null, 1)],
  ]

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{player.handle}</h1>
          <p className="text-sm text-muted">
            {[player.realName, player.country && `${flag(player.country)} ${player.country}`]
              .filter(Boolean)
              .join(' · ')}
            {player.team && (
              <>
                {(player.realName || player.country) && ' · '}
                <Link href={`/teams/${player.team.slug}`} className="text-fg/80 hover:underline">
                  {player.team.name}
                </Link>
              </>
            )}
          </p>
        </div>
        <FollowButton type="player" id={player.id} />
      </header>

      <section aria-labelledby="averages">
        <h2 id="averages" className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Last 30 days{avg && ` · ${avg.maps} map${avg.maps === 1 ? '' : 's'}`}
        </h2>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {tiles.map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border bg-surface p-3">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="font-mono text-xl tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="recent">
        <h2 id="recent" className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Recent maps
        </h2>
        {player.recentMaps.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No maps played yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-[560px] text-sm tabular-nums">
              <thead className="text-xs text-muted">
                <tr className="border-b border-border">
                  <th scope="col" className="px-4 py-2 text-left font-medium">
                    Date
                  </th>
                  <th scope="col" className="px-2 py-2 text-left font-medium">
                    Map
                  </th>
                  <th scope="col" className="px-2 py-2 text-left font-medium">
                    Opponent
                  </th>
                  <th scope="col" className="px-2 py-2 text-left font-medium">
                    Agent
                  </th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">
                    K / D / A
                  </th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">
                    ACS
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    ADR
                  </th>
                </tr>
              </thead>
              <tbody>
                {player.recentMaps.map((m) => (
                  <tr
                    key={`${m.seriesId}:${m.mapName}`}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-2 text-muted">
                      {m.playedAt ? day.format(new Date(m.playedAt)) : '–'}
                    </td>
                    <td className="px-2 py-2">
                      <Link href={`/matches/${m.seriesId}`} className="hover:underline">
                        {m.mapName}
                      </Link>
                      {m.won !== null && (
                        <span className={`ml-2 text-xs ${m.won ? 'text-accent' : 'text-live'}`}>
                          {m.won ? 'W' : 'L'}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {m.opponent ? (
                        <Link href={`/teams/${m.opponent.slug}`} className="hover:underline">
                          {m.opponent.tag}
                        </Link>
                      ) : (
                        'TBD'
                      )}
                    </td>
                    <td className="px-2 py-2 text-muted">{m.stat.agent ?? '–'}</td>
                    <td className="px-2 py-2 text-right">
                      {m.stat.kills} / {m.stat.deaths} / {m.stat.assists}
                    </td>
                    <td className="px-2 py-2 text-right">{fixed(m.stat.acs)}</td>
                    <td className="px-4 py-2 text-right">{fixed(m.stat.adr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <Discussion type="player" id={player.id} />
    </main>
  )
}
