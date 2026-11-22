import type { Post, Series } from '@aced/types'
import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LiveUpcoming } from '@/app/_components/LiveUpcoming'
import { TopAcs } from '@/app/_components/TopAcs'
import { TransferTracker } from '@/app/_components/TransferTracker'
import { Trending } from '@/app/_components/Trending'

const api = vi.hoisted(() => ({
  series: vi.fn(),
  rumors: vi.fn(),
  trending: vi.fn(),
  acsLeaders: vi.fn(),
}))
vi.mock('@/lib/api', () => ({ api, esportsCache: {} }))

const team = (tag: string) => ({ id: tag, name: tag, tag, slug: tag.toLowerCase() })
const series = (id: string, status: Series['status'], inHours: number, a: string, b: string) =>
  ({
    id,
    status,
    teamA: team(a),
    teamB: team(b),
    score: [1, 0],
    scheduledAt: new Date(Date.now() + inHours * 3600_000).toISOString(),
  }) as Series
const rumor = (id: string, rumorStatus: Post['rumorStatus'], daysAgo: number) =>
  ({
    id,
    title: `Rumor ${id}`,
    rumorStatus,
    createdAt: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
  }) as Post

describe('home rail cards', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists live series first, then upcoming ones with a countdown', async () => {
    api.series.mockImplementation(async (q: { status?: string }) =>
      q.status === 'live'
        ? { items: [series('l', 'live', -5, 'EXH', 'RK')] }
        : {
            items: [
              series('s', 'scheduled', 2.5, 'HAL', 'EMB'),
              series('c', 'completed', 1, 'X', 'Y'),
            ],
          },
    )
    render(await LiveUpcoming())
    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(within(rows[0] as HTMLElement).getByText('1–0')).toBeInTheDocument()
    expect(within(rows[1] as HTMLElement).getByText('in 2h')).toBeInTheDocument()
  })

  it('shows the 4 newest rumors across statuses', async () => {
    api.rumors.mockImplementation(async (status: string) => ({
      items:
        status === 'open'
          ? [rumor('o1', 'open', 1), rumor('o2', 'open', 9)]
          : status === 'confirmed'
            ? [rumor('c1', 'confirmed', 2), rumor('c2', 'confirmed', 3)]
            : [rumor('d1', 'denied', 4)],
    }))
    render(await TransferTracker())
    const titles = screen.getAllByRole('link', { name: /^Rumor/ }).map((l) => l.textContent)
    expect(titles).toEqual([
      'Rumor o1Open',
      'Rumor c1Confirmed',
      'Rumor c2Confirmed',
      'Rumor d1Denied',
    ])
  })

  it('links trending tags and leaders to their pages', async () => {
    api.trending.mockResolvedValue({
      items: [{ type: 'player', id: '1', name: 'Sable', slug: 'sable', posts: 3 }],
    })
    api.acsLeaders.mockResolvedValue({
      items: [
        {
          rank: 1,
          player: { handle: 'Sable', slug: 'sable' },
          team: { tag: 'EXH', slug: 'exhale' },
          acs: 235,
          maps: 3,
        },
      ],
    })
    render(
      <>
        {await Trending()}
        {await TopAcs()}
      </>,
    )
    expect(screen.getByRole('link', { name: '@Sable' })).toHaveAttribute('href', '/players/sable')
    expect(screen.getByRole('link', { name: /^Sable\s*EXH$/ })).toHaveAttribute(
      'href',
      '/players/sable',
    )
    expect(screen.getByText('235')).toBeInTheDocument()
  })

  it('leaves a card out when the API fails', async () => {
    api.trending.mockRejectedValue(new Error('down'))
    expect(await Trending()).toBeNull()
  })
})
