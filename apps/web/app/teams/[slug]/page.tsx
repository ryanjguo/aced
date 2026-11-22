import { ApiClientError } from '@aced/api-client'
import type { TeamDetail } from '@aced/types'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { api } from '@/lib/api'
import { getTimeZone } from '@/lib/time-zone'
import { MatchList } from '../../matches/_components/MatchList'

type Props = { params: Promise<{ slug: string }> }

const getTeam = cache(async (slug: string): Promise<TeamDetail | 'not_found' | null> => {
  try {
    return await api.team(slug, { cache: 'no-store' })
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) return 'not_found'
    return null
  }
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const detail = await getTeam((await params).slug)
  if (!detail || detail === 'not_found') return { title: 'Team' }
  return {
    title: `${detail.team.name} (${detail.team.tag})`,
    description: `${detail.team.name} roster, results and upcoming matches.`,
  }
}

export default async function TeamPage({ params }: Props) {
  const [detail, timeZone] = await Promise.all([getTeam((await params).slug), getTimeZone()])
  if (detail === 'not_found') notFound()
  if (!detail) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p role="alert" className="py-12 text-center text-sm text-muted">
          Couldn't load this team. Try again in a moment.
        </p>
      </main>
    )
  }

  const { team, roster } = detail
  const region = team.region && team.region.charAt(0).toUpperCase() + team.region.slice(1)

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{team.name}</h1>
        <p className="text-sm text-muted">{[team.tag, region].filter(Boolean).join(' · ')}</p>
      </header>

      <section aria-labelledby="roster">
        <h2 id="roster" className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Roster
        </h2>
        {roster.length === 0 ? (
          <p className="text-sm text-muted">No current roster.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {roster.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/players/${p.slug}`}
                  className="block rounded-lg border border-border bg-surface px-3 py-2 transition-colors hover:bg-border/40"
                >
                  <p className="truncate font-medium">{p.handle}</p>
                  <p className="truncate text-xs text-muted">{p.realName ?? p.country ?? ' '}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Matches">
        <MatchList series={[...detail.upcoming, ...detail.recent]} timeZone={timeZone} />
      </section>
    </main>
  )
}
