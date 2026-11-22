import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminPostActions } from '@/app/p/[id]/_components/AdminPostActions'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/lib/auth-client', () => ({
  authClient: { useSession: () => ({ data: { user: { role: 'admin' } } }) },
}))
const modAction = vi.hoisted(() => vi.fn())
vi.mock('@/lib/api', () => ({ api: { modAction, regeneratePost: vi.fn() } }))

describe('AdminPostActions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('asks before hiding a post, and Keep cancels', async () => {
    render(<AdminPostActions postId="p1" removed={false} />)
    await userEvent.click(screen.getByRole('button', { name: 'Hide' }))
    expect(screen.getByText('Hide this post?')).toBeInTheDocument()
    expect(modAction).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Keep' }))
    expect(screen.queryByText('Hide this post?')).not.toBeInTheDocument()
  })

  it('hides after confirming', async () => {
    modAction.mockResolvedValue(null)
    render(<AdminPostActions postId="p1" removed={false} />)
    await userEvent.click(screen.getByRole('button', { name: 'Hide' }))
    await userEvent.click(screen.getByRole('button', { name: 'Hide' }))
    expect(modAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'remove', targetType: 'post', targetId: 'p1' }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent('Hidden.')
  })
})
