'use client'

import type { HealthResponse } from '@aced/types'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

/** Checked from the browser so static pages don't show a status frozen at build time. */
export function ApiStatus() {
  const [health, setHealth] = useState<HealthResponse | null | undefined>(undefined)

  useEffect(() => {
    api.health({ signal: AbortSignal.timeout(3000) }).then(setHealth, () => setHealth(null))
  }, [])

  if (health === undefined) return <p className="h-4" />
  const label = !health ? 'API unreachable' : health.status === 'ok' ? 'All systems ok' : 'Degraded'
  const color = health?.status === 'ok' ? 'bg-accent' : 'bg-muted'

  return (
    <p className="flex items-center justify-center gap-2 text-xs text-muted">
      <span className={`inline-block size-2 rounded-full ${color}`} />
      {label}
      {health && health.status !== 'ok' && (
        <span>
          (postgres {health.checks.postgres ? 'up' : 'down'}, redis{' '}
          {health.checks.redis ? 'up' : 'down'}
          {health.checks.worker === false && ', data sync stale'})
        </span>
      )}
    </p>
  )
}
