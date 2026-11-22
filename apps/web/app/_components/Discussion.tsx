import type { TagEntityType } from '@aced/types'
import Link from 'next/link'
import { serverApi } from '@/lib/server-api'
import { PostFeed } from './PostFeed'

/** Posts tagged with a player, team or event, hottest first. */
export async function Discussion({ type, id }: { type: TagEntityType; id: string }) {
  const page = await serverApi()
    .then((api) => api.entityPosts(type, id, { sort: 'hot' }, { cache: 'no-store' }))
    .catch(() => null)

  return (
    <section aria-labelledby="discussion">
      <div className="mb-2 flex items-center justify-between">
        <h2 id="discussion" className="text-rail-heading">
          Discussion
        </h2>
        <Link href="/submit" className="text-xs text-muted hover:text-fg">
          New post
        </Link>
      </div>
      {page ? (
        <PostFeed
          source={{ entityType: type, entityId: id }}
          query={{ sort: 'hot' }}
          initial={page}
        />
      ) : (
        <p role="alert" className="py-8 text-center text-sm text-muted">
          Couldn't load discussion.
        </p>
      )}
    </section>
  )
}
