import type { Metadata } from 'next'
import Link from 'next/link'
import { api } from '@/lib/api'

export const metadata: Metadata = { title: 'Boards' }
export const dynamic = 'force-dynamic'

export default async function BoardsPage() {
  const boards = await api.boards({ cache: 'no-store' }).catch(() => null)

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Boards</h1>
      {boards ? (
        <ul className="overflow-hidden rounded-lg border border-border bg-surface">
          {boards.items.map((b) => (
            <li key={b.id} className="border-b border-border last:border-b-0">
              <Link
                href={`/b/${b.slug}`}
                className="block px-4 py-3 transition-colors hover:bg-border/40"
              >
                <p className="font-medium">{b.name}</p>
                {b.description && <p className="text-sm text-muted">{b.description}</p>}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p role="alert" className="py-12 text-center text-sm text-muted">
          Couldn't load boards. Try again in a moment.
        </p>
      )}
    </main>
  )
}
