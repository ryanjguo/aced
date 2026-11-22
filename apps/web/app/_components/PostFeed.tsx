'use client'

import type { BoardPostsQuery } from '@aced/api-client'
import type { Post, TagEntityType } from '@aced/types'
import { useEffect, useRef, useState } from 'react'
import { PostRow } from '@/app/_components/PostRow'
import { api } from '@/lib/api'

/** Server-rendered first page, then loads more as the end of the list scrolls into view. */
export type FeedSource =
  | { board: string }
  | { entityType: TagEntityType; entityId: string }
  | { search: string }

export function PostFeed({
  source,
  query,
  initial,
  emptyText = 'No posts yet.',
}: {
  source: FeedSource
  emptyText?: string
  query: BoardPostsQuery
  initial: { items: Post[]; nextCursor: string | null }
}) {
  const [items, setItems] = useState(initial.items)
  const [cursor, setCursor] = useState(initial.nextCursor)
  const [error, setError] = useState(false)
  const loading = useRef(false)
  const sentinel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sentinel.current
    if (!el || !cursor) return
    const observer = new IntersectionObserver(async ([entry]) => {
      if (!entry?.isIntersecting || loading.current) return
      loading.current = true
      try {
        const params = { ...query, cursor }
        const page =
          'board' in source
            ? await api.boardPosts(source.board, params)
            : 'search' in source
              ? await api.searchPosts(source.search, cursor)
              : await api.entityPosts(source.entityType, source.entityId, params)
        setItems((prev) => [...prev, ...page.items])
        setCursor(page.nextCursor)
      } catch {
        setError(true)
      } finally {
        loading.current = false
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [source, query, cursor])

  if (items.length === 0) {
    return <p className="py-12 text-center text-sm text-muted">{emptyText}</p>
  }

  return (
    <>
      <ul className="overflow-hidden rounded-lg border border-border bg-surface">
        {items.map((post) => (
          <PostRow key={post.id} post={post} showBoard={!('board' in source)} />
        ))}
      </ul>
      {cursor && !error && <div ref={sentinel} className="h-12" aria-hidden />}
      {error && (
        <p role="alert" className="py-6 text-center text-sm text-muted">
          Couldn't load more posts.
        </p>
      )}
    </>
  )
}
