import type { BoardRow, CommentRow, PostRow, UserRow } from '@aced/db'
import type { Board, Comment, Post, VoteValue } from '@aced/types'
import { toUserSummary } from '../user.js'

export function toBoard(row: BoardRow): Board {
  return { id: row.id, slug: row.slug, name: row.name, description: row.description }
}

export function toPost(
  row: PostRow,
  author: UserRow | null,
  board: BoardRow | null,
  myVote: VoteValue = 0,
): Post {
  return {
    id: row.id,
    kind: row.kind,
    author: author ? toUserSummary(author) : null,
    board: board ? { id: board.id, slug: board.slug, name: board.name } : null,
    title: row.title,
    // Removed posts keep their place in threads but not their content.
    body: row.isRemoved ? '' : row.body,
    url: row.isRemoved ? null : row.url,
    seriesId: row.seriesId,
    score: row.score,
    commentCount: row.commentCount,
    isLocked: row.isLocked,
    isRemoved: row.isRemoved,
    myVote,
    createdAt: row.createdAt.toISOString(),
    editedAt: row.editedAt?.toISOString() ?? null,
  }
}

export function toComment(
  row: CommentRow,
  author: UserRow | null,
  replyCount: number,
  myVote: VoteValue = 0,
): Comment {
  return {
    id: row.id,
    postId: row.postId,
    parentId: row.parentId,
    // Removed comments stay in the tree as placeholders.
    author: row.isRemoved || !author ? null : toUserSummary(author),
    body: row.isRemoved ? '' : row.body,
    score: row.score,
    depth: row.depth,
    replyCount,
    isRemoved: row.isRemoved,
    myVote,
    createdAt: row.createdAt.toISOString(),
    editedAt: row.editedAt?.toISOString() ?? null,
  }
}
