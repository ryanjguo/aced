import type { Metadata } from 'next'
import { MatchList } from './_components/MatchList'
import { fakeSeries } from './_data/fake-series'

export const metadata: Metadata = { title: 'Matches' }
export const dynamic = 'force-dynamic'

export default function MatchesPage() {
  const series = fakeSeries()

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Matches</h1>
      <MatchList series={series} />
    </main>
  )
}
