import type { BoardRow, PostRow, UserRow } from '@aced/db'
import type { Board, Post } from '@aced/types'
import { toUserSummary } from '../user.js'

export function toBoard(row: BoardRow): Board {
  return { id: row.id, slug: row.slug, name: row.name, description: row.description }
}

export function toPost(row: PostRow, author: UserRow | null, board: BoardRow | null): Post {
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
    createdAt: row.createdAt.toISOString(),
    editedAt: row.editedAt?.toISOString() ?? null,
  }
}
