import type { Post } from '@aced/types'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PostRow } from '@/app/_components/PostRow'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/' }))
vi.mock('@/lib/auth-client', () => ({ authClient: { useSession: () => ({ data: null }) } }))
vi.mock('@/lib/api', () => ({ api: { vote: vi.fn() } }))

const post = (over: Partial<Post>): Post =>
  ({
    id: 'p1',
    kind: 'thread',
    title: 'A post',
    body: '',
    url: null,
    score: 0,
    myVote: 0,
    commentCount: 2,
    createdAt: new Date().toISOString(),
    author: { id: 'u1', handle: 'frag_queen', avatarUrl: null, role: 'user' },
    board: null,
    tags: [],
    data: null,
    rumorStatus: null,
    ...over,
  }) as Post

const meta = () => screen.getByText(/comments?$/).parentElement?.textContent

describe('PostRow metadata', () => {
  it("shows the author's handle", () => {
    render(<PostRow post={post({})} />)
    expect(meta()).toContain('@frag_queen·2 comments')
  })

  it('marks generated posts, which have no author, without a stray separator', () => {
    render(<PostRow post={post({ kind: 'match_thread', author: null })} />)
    expect(meta()).toContain('Auto-generated·2 comments')
    expect(meta()).not.toContain('··')
  })

  it("shows [deleted] for a deleted user's post", () => {
    render(<PostRow post={post({ author: null })} />)
    expect(meta()).toContain('[deleted]·2 comments')
  })
})
