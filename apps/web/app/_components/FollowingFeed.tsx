'use client'

import type { Page, Post } from '@aced/types'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { authClient } from '@/lib/auth-client'
import { PostFeed } from './PostFeed'

/** Loads in the browser, where the session cookie is available. */
export function FollowingFeed() {
  const { data: session, isPending } = authClient.useSession()
  const [page, setPage] = useState<Page<Post> | 'error' | null>(null)

  useEffect(() => {
    if (session) api.feed('following').then(setPage, () => setPage('error'))
  }, [session])

  if (!isPending && !session) {
    return (
      <p className="py-12 text-center text-sm text-muted">
        <Link href="/signin?from=%2F%3Ftab%3Dfollowing" className="text-accent hover:underline">
          Sign in
        </Link>{' '}
        to see posts about the players, teams and people you follow.
      </p>
    )
  }
  if (page === 'error') {
    return (
      <p role="alert" className="py-12 text-center text-sm text-muted">
        Couldn't load your feed. Try again in a moment.
      </p>
    )
  }
  if (!page) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    )
  }
  return (
    <PostFeed
      source={{ feed: 'following' }}
      query={{}}
      initial={page}
      emptyText="Nothing here yet. Follow players, teams, events or people to fill this feed."
    />
  )
}
