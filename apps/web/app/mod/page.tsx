import type { Metadata } from 'next'
import { ModQueue } from './_components/ModQueue'

export const metadata: Metadata = { title: 'Mod queue', robots: { index: false } }

export default function ModPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Mod queue</h1>
      <ModQueue />
    </main>
  )
}
