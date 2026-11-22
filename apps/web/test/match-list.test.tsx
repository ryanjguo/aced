import type { Series, Team } from '@aced/types'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { MatchList } from '@/app/matches/_components/MatchList'

const NOW = new Date('2027-03-10T12:00:00Z')
const team = (tag: string): Team => ({
  id: tag,
  name: `Team ${tag}`,
  tag,
  slug: tag.toLowerCase(),
  region: 'americas',
  logoUrl: null,
})
const series = (id: string, hours: number, status: Series['status'], b: Team | null = team('B')) =>
  ({
    id,
    event: { id: 'e', name: 'Stage 1', slug: 'stage-1' },
    teamA: team('A'),
    teamB: b,
    bestOf: 3,
    scheduledAt: new Date(NOW.getTime() + hours * 3_600_000).toISOString(),
    status,
    score: [2, 0],
    winnerId: status === 'completed' ? 'A' : null,
  }) as Series

describe('MatchList', () => {
  beforeAll(() => vi.useFakeTimers({ now: NOW, toFake: ['Date'] }))
  afterAll(() => vi.useRealTimers())

  const all = [
    series('today', 2, 'scheduled'),
    series('tomorrow', 24, 'scheduled', null),
    series('live', -1, 'live'),
    series('done', -24, 'completed'),
  ]

  it('groups upcoming and live matches by day, soonest first', () => {
    render(<MatchList series={all} timeZone="UTC" />)
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headings).toEqual(['Today', 'Tomorrow'])
    const today = screen.getByRole('heading', { name: 'Today' }).parentElement as HTMLElement
    expect(within(today).getAllByRole('listitem')).toHaveLength(2)
    expect(within(today).getByText('LIVE')).toBeInTheDocument()
  })

  it('shows TBD for a missing team', () => {
    render(<MatchList series={all} timeZone="UTC" />)
    const tomorrow = screen.getByRole('heading', { name: 'Tomorrow' }).parentElement as HTMLElement
    expect(within(tomorrow).getByText('TBD')).toBeInTheDocument()
  })

  it('switches to results', async () => {
    render(<MatchList series={all} timeZone="UTC" />)
    await userEvent.click(screen.getByRole('tab', { name: 'results' }))
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Yesterday',
    ])
  })

  it('says when there is nothing to show', () => {
    render(<MatchList series={[]} timeZone="UTC" />)
    expect(screen.getByText('No upcoming matches.')).toBeInTheDocument()
  })
})
