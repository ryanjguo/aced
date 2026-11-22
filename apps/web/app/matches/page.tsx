import type { Metadata } from 'next'
import { MatchList } from '@/components/MatchList'
import { api } from '@/lib/api'
import { getTimeZone } from '@/lib/time-zone'

export const metadata: Metadata = { title: 'Matches' }
export const dynamic = 'force-dynamic'

export default async function MatchesPage() {
  const [result, timeZone] = await Promise.all([
    api.series({}, { cache: 'no-store' }).catch(() => null),
    getTimeZone(),
  ])

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-page-title">Matches</h1>
      {result ? (
        <MatchList series={result.items} timeZone={timeZone} />
      ) : (
        <p role="alert" className="py-12 text-center text-sm text-muted">
          Couldn't load matches. Try again in a moment.
        </p>
      )}
    </main>
  )
}
