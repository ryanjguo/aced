import type { PostSort, TopWindow } from '@aced/types'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { serverApi } from '@/lib/server-api'
import { cn } from '@/lib/utils'
import { PostFeed } from '../../_components/PostFeed'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ sort?: string; t?: string }>
}

const SORTS: PostSort[] = ['hot', 'new', 'top']
const WINDOWS: TopWindow[] = ['day', 'week', 'all']

const getBoards = cache(() => api.boards({ cache: 'no-store' }))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const board = (await getBoards().catch(() => null))?.items.find((b) => b.slug === slug)
  return { title: board?.name ?? 'Board', description: board?.description }
}

export default async function BoardPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const sort = SORTS.find((s) => s === sp.sort) ?? 'hot'
  const t = WINDOWS.find((w) => w === sp.t) ?? 'week'
  const query = sort === 'top' ? { sort, t } : { sort }

  const [boards, page] = await Promise.all([
    getBoards().catch(() => null),
    serverApi()
      .then((a) => a.boardPosts(slug, query, { cache: 'no-store' }))
      .catch(() => null),
  ])
  const board = boards?.items.find((b) => b.slug === slug)
  if (boards && !board) notFound()

  const tab = (active: boolean) =>
    cn(
      'rounded-md px-3 py-1.5 text-sm capitalize transition-colors',
      active ? 'bg-bg text-fg' : 'text-muted hover:text-fg',
    )

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{board?.name ?? slug}</h1>
          {board?.description && <p className="text-sm text-muted">{board.description}</p>}
        </div>
        <Button asChild size="sm">
          <Link href={board ? `/submit?board=${board.id}` : '/submit'}>New post</Link>
        </Button>
      </header>

      <nav aria-label="Sort posts" className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
          {SORTS.map((s) => (
            <Link
              key={s}
              href={`/b/${slug}?sort=${s}`}
              aria-current={s === sort ? 'page' : undefined}
              className={tab(s === sort)}
            >
              {s}
            </Link>
          ))}
        </div>
        {sort === 'top' && (
          <div className="flex gap-1 text-xs">
            {WINDOWS.map((w) => (
              <Link
                key={w}
                href={`/b/${slug}?sort=top&t=${w}`}
                aria-current={w === t ? 'page' : undefined}
                className={cn(
                  'rounded px-2 py-1',
                  w === t ? 'text-fg' : 'text-muted hover:text-fg',
                )}
              >
                {w === 'all' ? 'All time' : `This ${w}`}
              </Link>
            ))}
          </div>
        )}
      </nav>

      {page ? (
        <PostFeed key={`${sort}:${t}`} source={{ board: slug }} query={query} initial={page} />
      ) : (
        <p role="alert" className="py-12 text-center text-sm text-muted">
          Couldn't load posts. Try again in a moment.
        </p>
      )}
    </main>
  )
}
