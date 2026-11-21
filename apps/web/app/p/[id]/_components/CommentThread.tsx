'use client'

import type { CommentNode, Page } from '@aced/types'
import { useState } from 'react'
import { Markdown } from '@/components/Markdown'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { timeAgo } from '@/lib/time-ago'

function Comment({ comment }: { comment: CommentNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [replies, setReplies] = useState(comment.replies)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const hiddenReplies = comment.replyCount - replies.length

  async function loadReplies() {
    setLoading(true)
    setError(false)
    try {
      setReplies((await api.commentReplies(comment.id)).items)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <li className="flex gap-2">
      {/* The thread rule doubles as the collapse control. */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expand thread' : 'Collapse thread'}
        className="group flex w-3 shrink-0 justify-center pt-1"
      >
        <span className="w-px bg-border group-hover:bg-accent" />
      </button>
      <div className="min-w-0 flex-1 py-1">
        <p className="text-xs text-muted">
          <span className={comment.author ? 'text-fg/80' : ''}>
            {comment.author ? `@${comment.author.handle}` : '[removed]'}
          </span>
          {' · '}
          {comment.score} point{comment.score === 1 ? '' : 's'} ·{' '}
          <time dateTime={comment.createdAt}>{timeAgo(comment.createdAt)}</time>
          {comment.editedAt && ' · edited'}
          {collapsed && comment.replyCount > 0 && ` · ${comment.replyCount} more`}
        </p>
        {!collapsed && (
          <>
            <div className="mt-1">
              {comment.isRemoved ? (
                <p className="text-sm text-muted italic">[removed]</p>
              ) : (
                <Markdown>{comment.body}</Markdown>
              )}
            </div>
            {replies.length > 0 && (
              <ul className="mt-2 flex flex-col gap-2">
                {replies.map((r) => (
                  <Comment key={r.id} comment={r} />
                ))}
              </ul>
            )}
            {hiddenReplies > 0 && (
              <Button
                variant="link"
                size="sm"
                className="h-auto px-0 text-muted"
                disabled={loading}
                onClick={loadReplies}
              >
                {loading
                  ? 'Loading…'
                  : `Load ${hiddenReplies} more repl${hiddenReplies === 1 ? 'y' : 'ies'}`}
              </Button>
            )}
            {error && <p className="text-xs text-live">Couldn't load replies.</p>}
          </>
        )}
      </div>
    </li>
  )
}

export function CommentThread({ postId, initial }: { postId: string; initial: Page<CommentNode> }) {
  const [comments, setComments] = useState(initial.items)
  const [cursor, setCursor] = useState(initial.nextCursor)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

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

  if (comments.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No comments yet.</p>
  }
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {comments.map((c) => (
          <Comment key={c.id} comment={c} />
        ))}
      </ul>
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
  )
}
