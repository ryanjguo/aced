import type { RumorStatus } from '@aced/types'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { serverApi } from '@/lib/server-api'
import { cn } from '@/lib/utils'
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
      <nav
        aria-label="Rumor status"
        className="flex gap-1 rounded-lg border border-border bg-surface p-1"
      >
        {TABS.map(([s, label]) => (
          <Link
            key={s}
            href={s === 'open' ? '/rumors' : `/rumors?status=${s}`}
            aria-current={s === status ? 'page' : undefined}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-center text-sm transition-colors',
              s === status ? 'bg-bg text-fg' : 'text-muted hover:text-fg',
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
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
