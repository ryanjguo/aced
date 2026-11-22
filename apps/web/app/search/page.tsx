import type { EntityResult, TagEntityType } from '@aced/types'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { serverApi } from '@/lib/server-api'
import { PostFeed } from '../_components/PostFeed'

type Props = { searchParams: Promise<{ q?: string }> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = (await searchParams).q?.trim()
  return { title: q ? `Search: ${q}` : 'Search', robots: { index: false } }
}

const SECTIONS: [TagEntityType, string, (slug: string) => string][] = [
  ['player', 'Players', (s) => `/players/${s}`],
  ['team', 'Teams', (s) => `/teams/${s}`],
  ['event', 'Events', (s) => `/events/${s}`],
]

export default async function SearchPage({ searchParams }: Props) {
  const q = (await searchParams).q?.trim().slice(0, 200) ?? ''
  const api = await serverApi()
  const [entities, posts] = q
    ? await Promise.all([
        api.searchEntities(q, undefined, { cache: 'no-store' }).catch(() => null),
        api.searchPosts(q, undefined, { cache: 'no-store' }).catch(() => null),
      ])
    : [null, null]
  const byType = (type: TagEntityType): EntityResult[] =>
    entities?.items.filter((e) => e.type === type) ?? []

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <search>
        <form action="/search" className="flex gap-2">
          <Input
            type="search"
            name="q"
            // No browser history dropdown under the box.
            autoComplete="off"
            defaultValue={q}
            aria-label="Search"
            placeholder="Players, teams, events and posts"
          />
          <Button type="submit">Search</Button>
        </form>
      </search>

      {q &&
        SECTIONS.map(([type, label, href]) =>
          byType(type).length ? (
            <section key={type} aria-label={label}>
              <h2 className="mb-2 text-rail-heading">{label}</h2>
              <ul className="overflow-hidden rounded-lg border border-border bg-surface">
                {byType(type).map((e) => (
                  <li key={e.id} className="border-b border-border last:border-b-0">
                    <Link
                      href={href(e.slug)}
                      className="flex items-center justify-between gap-3 px-4 py-2 transition-colors hover:bg-border/40"
                    >
                      <span className="truncate">{e.name}</span>
                      {e.detail && <span className="shrink-0 text-xs text-muted">{e.detail}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null,
        )}

      {q && (
        <section aria-label="Posts">
          <h2 className="mb-2 text-rail-heading">Posts</h2>
          {posts ? (
            <PostFeed
              key={q}
              source={{ search: q }}
              query={{}}
              initial={posts}
              emptyText="No matching posts."
            />
          ) : (
            <p role="alert" className="py-8 text-center text-sm text-muted">
              Couldn't search posts. Try again in a moment.
            </p>
          )}
        </section>
      )}
    </main>
  )
}
