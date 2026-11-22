'use client'

import type { CommentNode, Page, UserSummary } from '@aced/types'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { authClient } from '@/lib/auth-client'
import { CommentEditor } from './CommentEditor'
import { CommentItem } from './CommentItem'
import { addOptimistic, Thread } from './thread'

export function CommentThread({
  postId,
  locked,
  initial,
}: {
  postId: string
  locked: boolean
  initial: Page<CommentNode>
}) {
  const { data: session, isPending } = authClient.useSession()
  const [comments, setComments] = useState(initial.items)
  const [cursor, setCursor] = useState(initial.nextCursor)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const viewer: UserSummary | null = session
    ? {
        id: session.user.id,
        handle: session.user.handle,
        avatarUrl: session.user.image ?? null,
        role: session.user.role as UserSummary['role'],
      }
    : null

  async function loadMore() {
    if (!cursor) return
    setLoading(true)
    setError(false)
    try {
      const page = await api.postComments(postId, cursor)
      setComments((prev) => [...prev, ...page.items])
      setCursor(page.nextCursor)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Thread.Provider value={{ postId, viewer, locked }}>
      <div className="flex flex-col gap-4">
        {locked ? (
          <p className="text-sm text-muted">Comments are locked.</p>
        ) : viewer ? (
          <CommentEditor onSubmit={(text) => addOptimistic(postId, viewer, setComments, text)} />
        ) : (
          !isPending && (
            <p className="text-sm text-muted">
              <Link
                href={`/signin?from=${encodeURIComponent(`/p/${postId}`)}`}
                className="text-accent hover:underline"
              >
                Sign in
              </Link>{' '}
              to comment.
            </p>
          )
        )}

        {comments.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No comments yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {comments.map((c) => (
              <CommentItem key={c.id} comment={c} />
            ))}
          </ul>
        )}
        {cursor && (
          <Button variant="outline" onClick={loadMore} disabled={loading}>
            {loading ? 'Loading…' : 'More comments'}
          </Button>
        )}
        {error && (
          <p role="alert" className="text-center text-sm text-live">
            Couldn't load more comments.
          </p>
        )}
      </div>
    </Thread.Provider>
  )
}
