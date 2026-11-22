import Link from 'next/link'
import { serverApi } from '@/lib/server-api'
import { cn } from '@/lib/utils'
import { FollowingFeed } from './_components/FollowingFeed'
import { LeftRail } from './_components/LeftRail'
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

  // Text tabs (doc: Tabs): the selected feed is fg with a crimson underline.
  const tabClass = (active: boolean) =>
    cn(
      '-mb-px border-b-2 pt-1 pb-2 text-[13px] transition-colors',
      active ? 'border-accent font-medium text-fg' : 'border-transparent text-muted hover:text-fg',
    )

  return (
    // Three columns (doc: Layout); rails wrap under the feed below ~1024px.
    <div className="mx-auto flex max-w-[1240px] flex-wrap items-start gap-5 px-4 py-5 md:px-5">
      <LeftRail />
      <main className="flex min-w-0 flex-[999_1_520px] flex-col gap-4">
        <h1 className="sr-only">Home</h1>
        <TakeComposer />
        <nav aria-label="Feeds" className="flex gap-5 border-b border-border">
          <Link
            href="/"
            aria-current={tab === 'for-you' ? 'page' : undefined}
            className={tabClass(tab === 'for-you')}
          >
            For you
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
      {/* Right rail: live matches, transfers, trending and top ACS (#187, #188). */}
      <aside
        aria-label="Highlights"
        className="flex max-w-[280px] flex-[1_1_240px] flex-col gap-4 empty:hidden"
      />
    </div>
  )
}
