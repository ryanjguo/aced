import { ApiClientError } from '@aced/api-client'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountData } from '@/app/settings/_components/AccountData'

const replace = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }))
const refetch = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth-client', () => ({
  authClient: { useSession: () => ({ data: { user: { handle: 'frag_queen' } }, refetch }) },
}))
const deleteMe = vi.hoisted(() => vi.fn())
vi.mock('@/lib/api', () => ({ api: { deleteMe } }))

describe('AccountData', () => {
  beforeEach(() => vi.clearAllMocks())

  it('links the JSON export', () => {
    render(<AccountData />)
    expect(screen.getByRole('link', { name: 'Download your data' })).toHaveAttribute(
      'href',
      expect.stringMatching(/\/me\/export$/),
    )
  })

  it('unlocks deletion only once the handle is typed, then signs out and goes home', async () => {
    deleteMe.mockResolvedValue(null)
    render(<AccountData />)
    const button = screen.getByRole('button', { name: 'Delete my account' })
    const input = screen.getByLabelText(/to confirm/)
    await userEvent.type(input, 'frag_quee')
    expect(button).toBeDisabled()
    await userEvent.type(input, 'n')
    expect(button).toBeEnabled()
    await userEvent.click(button)
    expect(deleteMe).toHaveBeenCalledWith('frag_queen')
    expect(refetch).toHaveBeenCalled()
    expect(replace).toHaveBeenCalledWith('/')
  })

  it('shows the error and stays put when deletion fails', async () => {
    deleteMe.mockRejectedValue(new ApiClientError(500, 'internal', 'down'))
    render(<AccountData />)
    await userEvent.type(screen.getByLabelText(/to confirm/), 'frag_queen')
    await userEvent.click(screen.getByRole('button', { name: 'Delete my account' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(replace).not.toHaveBeenCalled()
  })
})
