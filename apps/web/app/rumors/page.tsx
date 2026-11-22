import type { RumorStatus } from '@aced/types'
import type { Metadata } from 'next'
import Link from 'next/link'
import { LinkTabs } from '@/components/LinkTabs'
import { Button } from '@/components/ui/button'
import { serverApi } from '@/lib/server-api'
import { PostFeed } from '../_components/PostFeed'

export const metadata: Metadata = {
  title: 'Rumor tracker',
  description: 'Open, confirmed and denied transfer rumors.',
}

const TABS = [
  ['open', 'Open', 'No open rumors right now.'],
  ['confirmed', 'Confirmed', 'No confirmed rumors yet.'],
  ['denied', 'Denied', 'No denied rumors yet.'],
] as const satisfies readonly (readonly [RumorStatus, string, string])[]

export default async function RumorsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const requested = (await searchParams).status
  const [status, , emptyText] = TABS.find(([s]) => s === requested) ?? TABS[0]
  const page = await serverApi()
    .then((api) => api.rumors(status, undefined, { cache: 'no-store' }))
    .catch(() => null)

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-page-title">Rumor tracker</h1>
          <p className="text-sm text-muted">Every rumor with a source, and how it turned out.</p>
        </div>
        <Button asChild size="sm">
          <Link href="/submit">Post a rumor</Link>
        </Button>
      </header>
      <LinkTabs
        label="Rumor status"
        items={TABS.map(([s, label]) => ({
          href: s === 'open' ? '/rumors' : `/rumors?status=${s}`,
          label,
          current: s === status,
        }))}
      />
      {page ? (
        <PostFeed
          key={status}
          source={{ rumors: status }}
          query={{}}
          initial={page}
          emptyText={emptyText}
        />
      ) : (
        <p role="alert" className="py-12 text-center text-sm text-muted">
          Couldn't load rumors. Try again in a moment.
        </p>
      )}
    </main>
  )
}
