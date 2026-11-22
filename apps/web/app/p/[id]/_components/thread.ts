import type { CommentNode, UserSummary } from '@aced/types'
import { track } from '@vercel/analytics'
import { createContext } from 'react'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/api-error'

export const MAX_DEPTH = 6

export type SetComments = (update: (prev: CommentNode[]) => CommentNode[]) => void

export const Thread = createContext<{
  postId: string
  viewer: UserSummary | null
  locked: boolean
}>({
  postId: '',
  viewer: null,
  locked: false,
})

/** Adds the comment right away, then swaps in the saved one or rolls back. Returns an error message. */
export async function addOptimistic(
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
    track('comment_created', { reply: Boolean(parent) })
    return null
  } catch (err) {
    setComments((prev) => prev.filter((c) => c.id !== temp.id))
    return apiErrorMessage(err, "Couldn't post your comment. Try again.")
  }
}
