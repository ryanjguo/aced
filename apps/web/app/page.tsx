import Link from 'next/link'
import { LinkTabs } from '@/components/LinkTabs'
import { serverApi } from '@/lib/server-api'
import { cn } from '@/lib/utils'
import { FollowingFeed } from './_components/FollowingFeed'
import { LeftRail } from './_components/LeftRail'
import { LiveUpcoming } from './_components/LiveUpcoming'
import { PostFeed } from './_components/PostFeed'
import { TakeComposer } from './_components/TakeComposer'
import { TodayStrip } from './_components/TodayStrip'
import { TopAcs } from './_components/TopAcs'
import { TransferTracker } from './_components/TransferTracker'
import { Trending } from './_components/Trending'

export const dynamic = 'force-dynamic'

export default async function Home({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const tab = (await searchParams).tab === 'following' ? 'following' : 'for-you'
  const forYou =
    tab === 'for-you'
      ? await serverApi()
          .then((api) => api.feed('for-you', undefined, { cache: 'no-store' }))
          .catch(() => null)
      : null

  return (
    // Three columns (doc: Layout); rails wrap under the feed below ~1024px.
    <div className="mx-auto flex max-w-[1240px] flex-wrap items-start gap-5 px-4 py-5 md:px-5">
      <LeftRail />
      <main className="flex min-w-0 flex-[999_1_520px] flex-col gap-4">
        <h1 className="sr-only">Home</h1>
        <TodayStrip />
        <TakeComposer />
        <LinkTabs
          label="Feeds"
          items={[
            { href: '/', label: 'For you', current: tab === 'for-you' },
            { href: '/?tab=following', label: 'Following', current: tab === 'following' },
          ]}
        />
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
      {/* Right rail */}
      <aside aria-label="Highlights" className="flex max-w-[280px] flex-[1_1_240px] flex-col gap-4">
        <LiveUpcoming />
        <TransferTracker />
        <Trending />
        <TopAcs />
      </aside>
    </div>
  )
}
