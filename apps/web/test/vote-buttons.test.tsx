import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VoteButtons } from '@/components/VoteButtons'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }), usePathname: () => '/p/1' }))
const session = vi.hoisted(() => ({ data: { user: { id: 'u1' } } as unknown }))
vi.mock('@/lib/auth-client', () => ({ authClient: { useSession: () => session } }))
const vote = vi.hoisted(() => vi.fn())
vi.mock('@/lib/api', () => ({ api: { vote } }))

const renderVotes = () =>
  render(<VoteButtons targetType="post" targetId="p1" score={10} myVote={0} />)

describe('VoteButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    session.data = { user: { id: 'u1' } }
  })

  it('shows the vote at once, then the server result', async () => {
    let resolve: (v: unknown) => void = () => {}
    vote.mockReturnValue(new Promise((r) => (resolve = r)))
    renderVotes()
    await userEvent.click(screen.getByRole('button', { name: 'Upvote' }))
    expect(screen.getByText('11')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upvote' })).toHaveAttribute('aria-pressed', 'true')
    resolve({ score: 15, myVote: 1 })
    expect(await screen.findByText('15')).toBeInTheDocument()
    expect(vote).toHaveBeenCalledWith('post', 'p1', 1)
  })

  it('rolls back when the vote fails', async () => {
    vote.mockRejectedValue(new Error('down'))
    renderVotes()
    await userEvent.click(screen.getByRole('button', { name: 'Downvote' }))
    await waitFor(() => expect(screen.getByText('10')).toBeInTheDocument())
    expect(screen.getByText('10')).toHaveAttribute('title', "Couldn't save your vote")
    expect(screen.getByRole('button', { name: 'Downvote' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('clicking the same arrow again clears the vote', async () => {
    vote
      .mockResolvedValueOnce({ score: 11, myVote: 1 })
      .mockResolvedValueOnce({ score: 10, myVote: 0 })
    renderVotes()
    const up = screen.getByRole('button', { name: 'Upvote' })
    await userEvent.click(up)
    await userEvent.click(up)
    expect(vote).toHaveBeenLastCalledWith('post', 'p1', 0)
  })

  it('sends signed-out users to sign in', async () => {
    session.data = null
    renderVotes()
    await userEvent.click(screen.getByRole('button', { name: 'Upvote' }))
    expect(push).toHaveBeenCalledWith('/signin?from=%2Fp%2F1')
    expect(vote).not.toHaveBeenCalled()
  })
})

describe('VoteButtons on your own content', () => {
  it('disables both arrows', async () => {
    session.data = { user: { id: 'u1' } }
    render(<VoteButtons targetType="post" targetId="p1" score={4} myVote={0} ownerId="u1" />)
    expect(screen.getByRole('button', { name: 'Upvote' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Downvote' })).toBeDisabled()
    expect(screen.getByText('4')).toBeInTheDocument()
  })
})
