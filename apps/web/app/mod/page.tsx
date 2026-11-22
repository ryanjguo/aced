import type { Metadata } from 'next'
import { MatchedRumors } from './_components/MatchedRumors'
import { ModQueue } from './_components/ModQueue'

export const metadata: Metadata = { title: 'Mod queue', robots: { index: false } }

export default function ModPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-page-title">Mod queue</h1>
      <div className="flex flex-col gap-8">
        <MatchedRumors />
        <ModQueue />
      </div>
    </main>
  )
}
