'use client'

import type { CommentNode } from '@aced/types'
import { ReportButton } from '@/components/ReportButton'
import { Button } from '@/components/ui/button'
import { VoteButtons } from '@/components/VoteButtons'

export type CommentMode = 'view' | 'reply' | 'edit' | 'confirm-delete'

const action = 'h-auto px-0 text-xs text-muted hover:text-fg'

/** Vote, reply, edit, delete and report controls under a comment. */
export function CommentActions({
  comment,
  mode,
  setMode,
  canReply,
  mine,
  onDelete,
}: {
  comment: CommentNode
  mode: CommentMode
  setMode: (mode: CommentMode) => void
  canReply: boolean
  mine: boolean
  onDelete: () => void
}) {
  return (
    <div className="mt-1 flex items-center gap-3">
      <VoteButtons
        targetType="comment"
        targetId={comment.id}
        score={comment.score}
        myVote={comment.myVote}
        layout="row"
        ownerId={comment.author?.id}
      />
      {canReply && (
        <Button variant="link" size="sm" className={action} onClick={() => setMode('reply')}>
          Reply
        </Button>
      )}
      {mine && mode !== 'confirm-delete' && (
        <>
          <Button variant="link" size="sm" className={action} onClick={() => setMode('edit')}>
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
      {!mine && (
        <ReportButton
          targetType="comment"
          targetId={comment.id}
          ownerId={comment.author?.id}
          className={action}
        />
      )}
      {mode === 'confirm-delete' && (
        <span className="flex gap-3 text-xs">
          <span className="text-muted">Delete this comment?</span>
          <Button variant="link" size="sm" className={`${action} text-danger`} onClick={onDelete}>
            Delete
          </Button>
          <Button variant="link" size="sm" className={action} onClick={() => setMode('view')}>
            Keep
          </Button>
        </span>
      )}
    </div>
  )
}
