import type { Metadata } from 'next'
import { PostForm } from '@/app/_components/PostForm'
import { api } from '@/lib/api'

export const metadata: Metadata = { title: 'New post' }
export const dynamic = 'force-dynamic'

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ board?: string }>
}) {
  const { board } = await searchParams
  const boards = await api.boards({ cache: 'no-store' }).catch(() => null)
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">New post</h1>
      {boards ? (
        <PostForm boards={boards.items} initialBoardId={board} />
      ) : (
        <p role="alert" className="py-12 text-center text-sm text-muted">
          Couldn't load boards. Try again in a moment.
        </p>
      )}
    </main>
  )
}
