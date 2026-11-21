'use client'

import type { CommentNode, Page, UserSummary } from '@aced/types'
import Link from 'next/link'
import { createContext, type FormEvent, useContext, useState } from 'react'
import { Markdown } from '@/components/Markdown'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/api-error'
import { authClient } from '@/lib/auth-client'
import { timeAgo } from '@/lib/time-ago'

const MAX_DEPTH = 6

type SetComments = (update: (prev: CommentNode[]) => CommentNode[]) => void

const Thread = createContext<{ postId: string; viewer: UserSummary | null; locked: boolean }>({
  postId: '',
  viewer: null,
  locked: false,
})

/** Adds the comment right away, then swaps in the saved one or rolls back. Returns an error message. */
async function addOptimistic(
  postId: string,
  viewer: UserSummary,
  setComments: SetComments,
  body: string,
  parent?: CommentNode,
): Promise<string | null> {
  const temp: CommentNode = {
    id: `temp-${crypto.randomUUID()}`,
    postId,
    parentId: parent?.id ?? null,
    author: viewer,
    body,
    score: 0,
    depth: parent ? parent.depth + 1 : 0,
    replyCount: 0,
    isRemoved: false,
    myVote: 0,
    createdAt: new Date().toISOString(),
    editedAt: null,
    replies: [],
  }
  setComments((prev) => [temp, ...prev])
  try {
    const saved = await api.createComment(postId, { body, parentId: parent?.id })
    setComments((prev) => prev.map((c) => (c.id === temp.id ? saved : c)))
    return null
  } catch (err) {
    setComments((prev) => prev.filter((c) => c.id !== temp.id))
    return apiErrorMessage(err, "Couldn't post your comment. Try again.")
  }
}

function CommentBox({
  onSubmit,
  onCancel,
  initial = '',
  submitLabel = 'Comment',
  autoFocus = false,
}: {
  onSubmit: (body: string) => Promise<string | null>
  onCancel?: () => void
  initial?: string
  submitLabel?: string
  autoFocus?: boolean
}) {
  const [body, setBody] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    setBusy(true)
    setError(null)
    setBody('')
    const failed = await onSubmit(text)
    if (failed) {
      setError(failed)
      setBody(text)
    }
    setBusy(false)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <Textarea
        aria-label="Comment"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={10_000}
        placeholder="Markdown supported"
        autoFocus={autoFocus}
        // Start editing at the end of existing text, not the start.
        onFocus={(e) => e.currentTarget.setSelectionRange(body.length, body.length)}
      />
      {error && (
        <p role="alert" className="text-xs text-live">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy || !body.trim()}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}

function Comment({ comment }: { comment: CommentNode }) {
  const { postId, viewer, locked } = useContext(Thread)
  const [collapsed, setCollapsed] = useState(false)
  const [replies, setReplies] = useState(comment.replies)
  const [body, setBody] = useState(comment.body)
  const [removed, setRemoved] = useState(comment.isRemoved)
  const [edited, setEdited] = useState(comment.editedAt !== null)
  const [mode, setMode] = useState<'view' | 'reply' | 'edit' | 'confirm-delete'>('view')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hiddenReplies = comment.replyCount - replies.length
  const saved = !comment.id.startsWith('temp-')
  const mine = saved && !removed && viewer !== null && comment.author?.id === viewer.id

  async function loadReplies() {
    setLoading(true)
    setError(null)
    try {
      setReplies((await api.commentReplies(comment.id)).items)
    } catch {
      setError("Couldn't load replies.")
    } finally {
      setLoading(false)
    }
  }

  async function saveEdit(text: string) {
    const before = body
    setBody(text)
    setMode('view')
    try {
      await api.updateComment(comment.id, text)
      setEdited(true)
      return null
    } catch (err) {
      setBody(before)
      setMode('edit')
      return apiErrorMessage(err, "Couldn't save your edit.")
    }
  }

  async function remove() {
    setRemoved(true)
    setMode('view')
    try {
      await api.deleteComment(comment.id)
    } catch (err) {
      setRemoved(false)
      setError(apiErrorMessage(err, "Couldn't delete your comment."))
    }
  }

  const action = 'h-auto px-0 text-xs text-muted hover:text-fg'

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
          <span className={comment.author && !removed ? 'text-fg/80' : ''}>
            {comment.author && !removed ? `@${comment.author.handle}` : '[removed]'}
          </span>
          {' · '}
          {comment.score} point{comment.score === 1 ? '' : 's'} ·{' '}
          <time dateTime={comment.createdAt}>{timeAgo(comment.createdAt)}</time>
          {edited && ' · edited'}
          {!saved && ' · posting…'}
          {collapsed && comment.replyCount > 0 && ` · ${comment.replyCount} more`}
        </p>
        {!collapsed && (
          <>
            <div className="mt-1">
              {removed ? (
                <p className="text-sm text-muted italic">[removed]</p>
              ) : mode === 'edit' ? (
                <CommentBox
                  initial={body}
                  submitLabel="Save"
                  autoFocus
                  onSubmit={saveEdit}
                  onCancel={() => setMode('view')}
                />
              ) : (
                <Markdown>{body}</Markdown>
              )}
            </div>

            {saved && !removed && mode !== 'edit' && (
              <div className="mt-1 flex gap-3">
                {viewer && !locked && comment.depth < MAX_DEPTH && (
                  <Button
                    variant="link"
                    size="sm"
                    className={action}
                    onClick={() => setMode('reply')}
                  >
                    Reply
                  </Button>
                )}
                {mine && mode !== 'confirm-delete' && (
                  <>
                    <Button
                      variant="link"
                      size="sm"
                      className={action}
                      onClick={() => setMode('edit')}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="link"
                      size="sm"
                      className={action}
                      onClick={() => setMode('confirm-delete')}
                    >
                      Delete
                    </Button>
                  </>
                )}
                {mode === 'confirm-delete' && (
                  <span className="flex gap-3 text-xs">
                    <span className="text-muted">Delete this comment?</span>
                    <Button
                      variant="link"
                      size="sm"
                      className={`${action} text-live`}
                      onClick={remove}
                    >
                      Delete
                    </Button>
                    <Button
                      variant="link"
                      size="sm"
                      className={action}
                      onClick={() => setMode('view')}
                    >
                      Keep
                    </Button>
                  </span>
                )}
              </div>
            )}

            {mode === 'reply' && viewer && (
              <div className="mt-2">
                <CommentBox
                  submitLabel="Reply"
                  autoFocus
                  onCancel={() => setMode('view')}
                  onSubmit={async (text) => {
                    setMode('view')
                    const failed = await addOptimistic(postId, viewer, setReplies, text, comment)
                    if (failed) setMode('reply')
                    return failed
                  }}
                />
              </div>
            )}

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
            {error && <p className="text-xs text-live">{error}</p>}
          </>
        )}
      </div>
    </li>
  )
}

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
          <CommentBox onSubmit={(text) => addOptimistic(postId, viewer, setComments, text)} />
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
              <Comment key={c.id} comment={c} />
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
