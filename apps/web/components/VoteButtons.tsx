'use client'

import type { VoteValue } from '@aced/types'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/lib/api'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

export function VoteButtons({
  targetType,
  targetId,
  score: initialScore,
  myVote: initialVote,
  layout = 'column',
}: {
  targetType: 'post' | 'comment'
  targetId: string
  score: number
  myVote: VoteValue
  layout?: 'column' | 'row'
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = authClient.useSession()
  const [state, setState] = useState({ score: initialScore, myVote: initialVote })
  const [error, setError] = useState(false)

  async function vote(value: 1 | -1) {
    if (!session) {
      router.push(`/signin?from=${encodeURIComponent(pathname)}`)
      return
    }
    const before = state
    const next: VoteValue = state.myVote === value ? 0 : value
    setState({ score: state.score + next - state.myVote, myVote: next })
    setError(false)
    try {
      // The server's numbers win, which also corrects a stale myVote.
      setState(await api.vote(targetType, targetId, next))
    } catch {
      setState(before)
      setError(true)
    }
  }

  const button = 'rounded p-0.5 text-muted transition-colors hover:bg-border/60 hover:text-fg'
  return (
    <div className={cn('flex items-center', layout === 'column' ? 'flex-col' : 'flex-row gap-1')}>
      <button
        type="button"
        aria-label="Upvote"
        aria-pressed={state.myVote === 1}
        onClick={() => vote(1)}
        className={cn(button, state.myVote === 1 && 'text-accent hover:text-accent')}
      >
        <ChevronUp className="size-4" />
      </button>
      <span
        className={cn(
          'min-w-6 text-center font-mono text-xs tabular-nums',
          state.myVote === 1 && 'text-accent',
          state.myVote === -1 && 'text-live',
          error && 'text-live',
        )}
        title={error ? "Couldn't save your vote" : undefined}
      >
        {state.score}
      </span>
      <button
        type="button"
        aria-label="Downvote"
        aria-pressed={state.myVote === -1}
        onClick={() => vote(-1)}
        className={cn(button, state.myVote === -1 && 'text-live hover:text-live')}
      >
        <ChevronDown className="size-4" />
      </button>
    </div>
  )
}
