'use client'

import { ApiClientError } from '@aced/api-client'
import type { ModActionInput, ModQueueItem } from '@aced/types'
import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { authClient } from '@/lib/auth-client'
import { ReasonDialog } from './ReasonDialog'

type State =
  | { status: 'loading' }
  | { status: 'denied' }
  | { status: 'error' }
  | { status: 'ready'; items: ModQueueItem[]; nextCursor: string | null }

export function ModQueue() {
  const { data: session, isPending } = authClient.useSession()
  const [state, setState] = useState<State>({ status: 'loading' })
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async (cursor?: string) => {
    try {
      const page = await api.modReports(cursor)
      setState((prev) => ({
        status: 'ready',
        items: cursor && prev.status === 'ready' ? [...prev.items, ...page.items] : page.items,
        nextCursor: page.nextCursor,
      }))
    } catch (err) {
      const denied = err instanceof ApiClientError && (err.status === 401 || err.status === 403)
      setState({ status: denied ? 'denied' : 'error' })
    }
  }, [])

  useEffect(() => {
    if (!isPending) void load()
  }, [isPending, load])

  async function act(input: ModActionInput) {
    setActionError(null)
    try {
      await api.modAction(input)
      await load()
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : 'Action failed. Try again.')
    }
  }

  const role = session?.user.role
  if (state.status === 'denied' || (!isPending && role !== 'moderator' && role !== 'admin')) {
    return <p className="py-12 text-center text-sm text-muted">Page not found.</p>
  }
  if (state.status === 'loading') {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    )
  }
  if (state.status === 'error') {
    return (
      <p role="alert" className="py-12 text-center text-sm text-muted">
        Couldn't load the queue. Try again in a moment.
      </p>
    )
  }
  if (state.items.length === 0) {
    return <p className="py-12 text-center text-sm text-muted">The queue is clear.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {actionError && (
        <p role="alert" className="text-sm text-live">
          {actionError}
        </p>
      )}
      {state.items.map((item) => (
        <QueueItem key={`${item.targetType}:${item.targetId}`} item={item} act={act} />
      ))}
      {state.nextCursor && (
        <Button variant="outline" onClick={() => load(state.nextCursor ?? undefined)}>
          Load more
        </Button>
      )}
    </div>
  )
}

function QueueItem({
  item,
  act,
}: {
  item: ModQueueItem
  act: (input: ModActionInput) => Promise<void>
}) {
  const { targetType, targetId, preview } = item
  const target = { targetType, targetId }
  const authorId = targetType === 'user' ? targetId : preview?.author?.id

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="secondary" className="capitalize">
          {targetType}
        </Badge>
        {item.reasons.map((r) => (
          <Badge key={r} variant="outline">
            {r.replaceAll('_', ' ')}
          </Badge>
        ))}
        <span className="text-muted">
          {item.reportCount} report{item.reportCount === 1 ? '' : 's'}
        </span>
        {preview?.isRemoved && <Badge variant="destructive">Removed</Badge>}
        {preview?.isLocked && <Badge variant="secondary">Locked</Badge>}
      </div>

      {preview ? (
        <div className="flex flex-col gap-1 text-sm">
          {preview.title && <p className="font-semibold">{preview.title}</p>}
          {preview.body && (
            <p className="line-clamp-4 whitespace-pre-line text-fg/90">{preview.body}</p>
          )}
          {preview.author && targetType !== 'user' && (
            <p className="text-xs text-muted">by @{preview.author.handle}</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">This {targetType} no longer exists.</p>
      )}

      {item.notes.length > 0 && (
        <ul className="flex flex-col gap-1 border-l-2 border-border pl-3 text-xs text-muted">
          {item.notes.map((note) => (
            <li key={note}>“{note}”</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        {targetType !== 'user' &&
          (preview?.isRemoved ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => act({ ...target, action: 'restore' })}
            >
              Restore
            </Button>
          ) : (
            <ReasonDialog
              title={`Remove ${targetType}`}
              trigger={
                <Button size="sm" variant="destructive">
                  Remove
                </Button>
              }
              onConfirm={(reason) => act({ ...target, action: 'remove', reason })}
            />
          ))}
        {targetType === 'post' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => act({ ...target, action: preview?.isLocked ? 'unlock' : 'lock' })}
          >
            {preview?.isLocked ? 'Unlock' : 'Lock'}
          </Button>
        )}
        {authorId && (
          <ReasonDialog
            ban
            title={`Ban @${preview?.author?.handle ?? 'user'}`}
            trigger={
              <Button size="sm" variant="outline">
                Ban {targetType === 'user' ? 'user' : 'author'}
              </Button>
            }
            onConfirm={(reason, until) =>
              act({ action: 'ban', targetType: 'user', targetId: authorId, reason, until })
            }
          />
        )}
        <Button size="sm" variant="ghost" onClick={() => act({ ...target, action: 'dismiss' })}>
          Dismiss
        </Button>
      </div>
    </article>
  )
}
