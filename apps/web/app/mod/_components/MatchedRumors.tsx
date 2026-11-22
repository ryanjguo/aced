'use client'

import type { MatchedRumor } from '@aced/types'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { PostRow } from '@/app/_components/PostRow'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/api-error'

/** Open rumors that a confirmed transfer matched; shown above the reports queue. */
export function MatchedRumors() {
  const [items, setItems] = useState<MatchedRumor[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    api.matchedRumors().then(
      (page) => setItems(page.items),
      () => setItems([]),
    )
  }, [])
  useEffect(load, [load])

  async function resolve(postId: string, status: 'confirmed' | 'denied') {
    setError(null)
    try {
      await api.resolveRumor(postId, status)
      load()
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  if (items.length === 0) return null
  return (
    <section aria-labelledby="matched-rumors" className="flex flex-col gap-2">
      <h2 id="matched-rumors" className="text-xs font-semibold uppercase tracking-wide text-muted">
        Rumors matching confirmed transfers
      </h2>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <ul className="overflow-hidden rounded-lg border border-border bg-surface">
        {items.map(({ rumor, transferId }) => (
          <li key={rumor.id} className="border-b border-border last:border-b-0">
            <ul>
              <PostRow post={rumor} />
            </ul>
            <div className="flex flex-wrap items-center gap-2 px-4 pb-3 pl-[4.25rem]">
              <Button size="sm" onClick={() => resolve(rumor.id, 'confirmed')}>
                Confirm
              </Button>
              <Button size="sm" variant="outline" onClick={() => resolve(rumor.id, 'denied')}>
                Deny
              </Button>
              <Link href={`/p/${transferId}`} className="text-xs text-muted hover:text-fg">
                View transfer
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
