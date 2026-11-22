import Link from 'next/link'
import { serverApi } from '@/lib/server-api'
import { cn } from '@/lib/utils'
import { FollowingFeed } from './_components/FollowingFeed'
import { PostFeed } from './_components/PostFeed'
import { TakeComposer } from './_components/TakeComposer'

export const dynamic = 'force-dynamic'

export default async function Home({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const tab = (await searchParams).tab === 'following' ? 'following' : 'for-you'
  const forYou =
    tab === 'for-you'
      ? await serverApi()
          .then((api) => api.feed('for-you', undefined, { cache: 'no-store' }))
          .catch(() => null)
      : null

  const tabClass = (active: boolean) =>
    cn(
      'flex-1 rounded-md px-3 py-1.5 text-center text-sm transition-colors',
      active ? 'bg-bg text-fg' : 'text-muted hover:text-fg',
    )

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
      <h1 className="sr-only">Home</h1>
      <TakeComposer />
      <nav aria-label="Feeds" className="flex gap-1 rounded-lg border border-border bg-surface p-1">
        <Link
          href="/"
          aria-current={tab === 'for-you' ? 'page' : undefined}
          className={tabClass(tab === 'for-you')}
        >
          For You
        </Link>
        <Link
          href="/?tab=following"
          aria-current={tab === 'following' ? 'page' : undefined}
          className={tabClass(tab === 'following')}
        >
          Following
        </Link>
      </nav>
      {tab === 'following' ? (
        <FollowingFeed />
      ) : forYou ? (
        <PostFeed
          source={{ feed: 'for-you' }}
          query={{}}
          initial={forYou}
          emptyText="It's quiet. Start the conversation with a take."
        />
      ) : (
        <p role="alert" className="py-12 text-center text-sm text-muted">
          Couldn't load the feed. Try again in a moment.
        </p>
      )}
    </main>
  )
}
