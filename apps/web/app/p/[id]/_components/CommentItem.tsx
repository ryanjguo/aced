'use client'

import type { CommentNode } from '@aced/types'
import { useContext, useState } from 'react'
import { Markdown } from '@/components/Markdown'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/api-error'
import { timeAgo } from '@/lib/time-ago'
import { CommentActions, type CommentMode } from './CommentActions'
import { CommentEditor } from './CommentEditor'
import { addOptimistic, MAX_DEPTH, Thread } from './thread'

export function CommentItem({ comment }: { comment: CommentNode }) {
  const { postId, viewer, locked } = useContext(Thread)
  const [collapsed, setCollapsed] = useState(false)
  const [replies, setReplies] = useState(comment.replies)
  const [body, setBody] = useState(comment.body)
  const [removed, setRemoved] = useState(comment.isRemoved)
  const [edited, setEdited] = useState(comment.editedAt !== null)
  const [mode, setMode] = useState<CommentMode>('view')
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
                <CommentEditor
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
              <CommentActions
                comment={comment}
                mode={mode}
                setMode={setMode}
                canReply={viewer !== null && !locked && comment.depth < MAX_DEPTH}
                mine={mine}
                onDelete={remove}
              />
            )}

            {mode === 'reply' && viewer && (
              <div className="mt-2">
                <CommentEditor
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
                  <CommentItem key={r.id} comment={r} />
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
