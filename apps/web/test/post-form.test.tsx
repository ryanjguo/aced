import { ApiClientError } from '@aced/api-client'
import type { Board } from '@aced/types'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PostForm } from '@/app/_components/PostForm'

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('@/lib/auth-client', () => ({
  authClient: { useSession: () => ({ data: { user: { id: 'u1' } }, isPending: false }) },
}))
const createPost = vi.hoisted(() => vi.fn())
vi.mock('@/lib/api', () => ({ api: { createPost } }))
const track = vi.hoisted(() => vi.fn())
vi.mock('@vercel/analytics', () => ({ track }))

const boards: Board[] = [{ id: 'b1', slug: 'general', name: 'General', description: '' }]
const kind = (name: string) => userEvent.click(screen.getByRole('button', { name }))

describe('PostForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requires a title and board for threads, and a link for links', async () => {
    render(<PostForm boards={boards} />)
    expect(screen.getByLabelText('Title')).toBeRequired()
    expect(screen.getByLabelText('Board')).toBeRequired()
    expect(screen.queryByLabelText('Link')).not.toBeInTheDocument()
    await kind('link')
    expect(screen.getByLabelText('Link')).toBeRequired()
  })

  it('asks for a source and a player or team tag on rumors', async () => {
    render(<PostForm boards={boards} />)
    await kind('rumor')
    expect(screen.getByLabelText('Source')).toBeRequired()
    await userEvent.type(screen.getByLabelText('Title'), 'Tenz to Exhale')
    await userEvent.type(screen.getByLabelText('Source'), 'https://example.com/scoop')
    await userEvent.click(screen.getByRole('button', { name: 'Post' }))
    expect(screen.getByText('Tag the player or team the rumor is about.')).toBeInTheDocument()
    expect(createPost).not.toHaveBeenCalled()
  })

  it('shows API errors inline and keeps the form', async () => {
    createPost.mockRejectedValue(
      new ApiClientError(422, 'content_blocked', "That contains words that aren't allowed here"),
    )
    render(<PostForm boards={boards} />)
    await userEvent.type(screen.getByLabelText('Title'), 'A title')
    await userEvent.click(screen.getByRole('button', { name: 'Post' }))
    expect(await screen.findByText(/aren't allowed here/)).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('A title')
    expect(screen.getByRole('button', { name: 'Post' })).toBeEnabled()
  })

  it('creates a thread and opens it', async () => {
    createPost.mockResolvedValue({ id: 'p9' })
    render(<PostForm boards={boards} />)
    await userEvent.type(screen.getByLabelText('Title'), 'A title')
    await userEvent.click(screen.getByRole('button', { name: 'Post' }))
    expect(createPost).toHaveBeenCalledWith({
      kind: 'thread',
      boardId: 'b1',
      title: 'A title',
      body: '',
      tags: [],
    })
    expect(router.push).toHaveBeenCalledWith('/p/p9')
    expect(track).toHaveBeenCalledWith('post_created', { kind: 'thread' })
  })
})
