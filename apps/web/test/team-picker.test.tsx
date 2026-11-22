import type { Team } from '@aced/types'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TeamPicker } from '@/app/welcome/_components/TeamPicker'

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))
const finishOnboarding = vi.hoisted(() => vi.fn())
vi.mock('@/lib/api', () => ({ api: { finishOnboarding } }))

const team = (id: string, name: string, region: Team['region']): Team => ({
  id,
  name,
  tag: name.slice(0, 3).toUpperCase(),
  slug: name.toLowerCase(),
  region,
  logoUrl: null,
})
const teams = [
  team('a', 'Northwind', 'americas'),
  team('b', 'Exhale', 'americas'),
  team('c', 'Halcyon', 'emea'),
]

describe('TeamPicker', () => {
  beforeEach(() => vi.clearAllMocks())

  it('groups teams by region and follows the picked ones', async () => {
    finishOnboarding.mockResolvedValue(null)
    render(<TeamPicker teams={teams} next="/b/general" />)
    expect(screen.getByRole('heading', { name: 'Americas' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'EMEA' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: /Northwind/ }))
    await userEvent.click(screen.getByRole('button', { name: /Halcyon/ }))
    await userEvent.click(screen.getByRole('button', { name: /Halcyon/ }))
    await userEvent.click(screen.getByRole('button', { name: /Exhale/ }))
    expect(screen.getByRole('button', { name: /Northwind/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await userEvent.click(screen.getByRole('button', { name: 'Follow 2 and continue' }))
    expect(finishOnboarding).toHaveBeenCalledWith(['a', 'b'])
    expect(router.replace).toHaveBeenCalledWith('/b/general')
  })

  it('skips with no follows', async () => {
    finishOnboarding.mockResolvedValue(null)
    render(<TeamPicker teams={teams} next="/" />)
    await userEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(finishOnboarding).toHaveBeenCalledWith([])
    expect(router.replace).toHaveBeenCalledWith('/')
  })

  it('shows an error and stays when saving fails', async () => {
    finishOnboarding.mockRejectedValue(new Error('down'))
    render(<TeamPicker teams={teams} next="/" />)
    await userEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(router.replace).not.toHaveBeenCalled()
  })
})
