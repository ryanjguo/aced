'use client'

import type { Page, Post, ProfileComment } from '@aced/types'
import Link from 'next/link'
import { useState } from 'react'
import { PostRow } from '@/app/_components/PostRow'
import { Markdown } from '@/components/Markdown'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { timeAgo } from '@/lib/time-ago'

type Props =
  | { handle: string; tab: 'posts'; initial: Page<Post> }
  | { handle: string; tab: 'comments'; initial: Page<ProfileComment> }

export function ProfileFeed(props: Props) {
  const [posts, setPosts] = useState(props.tab === 'posts' ? props.initial.items : [])
  const [comments, setComments] = useState(props.tab === 'comments' ? props.initial.items : [])
  const [cursor, setCursor] = useState(props.initial.nextCursor)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  async function loadMore() {
    if (!cursor) return
    setLoading(true)
    setError(false)
    try {
      if (props.tab === 'posts') {
        const page = await api.userPosts(props.handle, cursor)
        setPosts((prev) => [...prev, ...page.items])
        setCursor(page.nextCursor)
      } else {
        const page = await api.userComments(props.handle, cursor)
        setComments((prev) => [...prev, ...page.items])
        setCursor(page.nextCursor)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const empty = props.tab === 'posts' ? posts.length === 0 : comments.length === 0
  if (empty) {
    return <p className="py-12 text-center text-sm text-muted">No {props.tab} yet.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="overflow-hidden rounded-lg border border-border bg-surface">
        {props.tab === 'posts'
          ? posts.map((post) => <PostRow key={post.id} post={post} />)
          : comments.map((c) => (
              <li key={c.id} className="border-b border-border px-4 py-3 last:border-b-0">
                <p className="mb-1 text-xs text-muted">
                  on{' '}
                  <Link href={`/p/${c.post.id}`} className="text-fg/80 hover:underline">
                    {c.post.title ?? 'a take'}
                  </Link>{' '}
                  · {c.score} point{c.score === 1 ? '' : 's'} ·{' '}
                  <time dateTime={c.createdAt}>{timeAgo(c.createdAt)}</time>
                </p>
                <Markdown>{c.body}</Markdown>
              </li>
            ))}
      </ul>
      {cursor && (
        <Button variant="outline" onClick={loadMore} disabled={loading}>
          {loading ? 'Loading…' : 'Load more'}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-center text-sm text-danger">
          Couldn't load more.
        </p>
      )}
    </div>
  )
}
