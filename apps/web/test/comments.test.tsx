import { ApiClientError } from '@aced/api-client'
import type { CommentNode, UserSummary } from '@aced/types'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommentEditor } from '@/app/p/[id]/_components/CommentEditor'
import { addOptimistic } from '@/app/p/[id]/_components/thread'

const createComment = vi.hoisted(() => vi.fn())
vi.mock('@/lib/api', () => ({ api: { createComment } }))

const viewer: UserSummary = { id: 'u1', handle: 'ana', avatarUrl: null, role: 'user' }

/** A tiny state holder standing in for React's setState. */
function list() {
  let items: CommentNode[] = []
  const set = (update: (prev: CommentNode[]) => CommentNode[]) => {
    items = update(items)
  }
  return { set, get: () => items }
}

describe('addOptimistic', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the comment straight away, then swaps in the saved one', async () => {
    const comments = list()
    let save: (c: CommentNode) => void = () => {}
    createComment.mockReturnValue(new Promise((r) => (save = r)))
    const done = addOptimistic('p1', viewer, comments.set, 'gg')
    expect(comments.get()).toHaveLength(1)
    expect(comments.get()[0]?.id).toMatch(/^temp-/)
    save({ ...comments.get()[0], id: 'c1' } as CommentNode)
    expect(await done).toBeNull()
    expect(comments.get().map((c) => c.id)).toEqual(['c1'])
  })

  it('removes the comment and explains a rate limit', async () => {
    const comments = list()
    createComment.mockRejectedValue(new ApiClientError(429, 'rate_limited', 'Slow down', 90))
    const error = await addOptimistic('p1', viewer, comments.set, 'gg')
    expect(comments.get()).toEqual([])
    expect(error).toBe("You're doing that too often. Try again in 2 minutes.")
  })

  it('passes the parent for replies', async () => {
    createComment.mockResolvedValue({ id: 'c2' })
    const parent = { id: 'c1', depth: 0 } as CommentNode
    const comments = list()
    await addOptimistic('p1', viewer, comments.set, 'reply', parent)
    expect(createComment).toHaveBeenCalledWith('p1', { body: 'reply', parentId: 'c1' })
  })
})

describe('CommentEditor', () => {
  it('keeps the text and shows the error when saving fails', async () => {
    const onSubmit = vi.fn().mockResolvedValue("That contains words that aren't allowed here")
    render(<CommentEditor onSubmit={onSubmit} />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Comment' }), '  hello  ')
    await userEvent.click(screen.getByRole('button', { name: 'Comment' }))
    expect(onSubmit).toHaveBeenCalledWith('hello')
    expect(screen.getByRole('alert')).toHaveTextContent("aren't allowed")
    expect(screen.getByRole('textbox', { name: 'Comment' })).toHaveValue('hello')
  })

  it('clears the box after a successful save and blocks empty comments', async () => {
    const onSubmit = vi.fn().mockResolvedValue(null)
    render(<CommentEditor onSubmit={onSubmit} />)
    const submit = screen.getByRole('button', { name: 'Comment' })
    expect(submit).toBeDisabled()
    await userEvent.type(screen.getByRole('textbox', { name: 'Comment' }), 'nice')
    await userEvent.click(submit)
    expect(screen.getByRole('textbox', { name: 'Comment' })).toHaveValue('')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
