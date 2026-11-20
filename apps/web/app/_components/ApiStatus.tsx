import type { HealthResponse } from '@aced/types'

async function getHealth(): Promise<HealthResponse | null> {
  const base = process.env.NEXT_PUBLIC_API_URL
  if (!base) return null
  try {
    const res = await fetch(`${base}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    })
    return (await res.json()) as HealthResponse
  } catch {
    return null
  }
}

export async function ApiStatus() {
  const health = await getHealth()
  const label = !health ? 'API unreachable' : health.status === 'ok' ? 'All systems ok' : 'Degraded'
  const color = health?.status === 'ok' ? 'bg-accent' : 'bg-muted'

  return (
    <p className="flex items-center gap-2 text-sm text-muted">
      <span className={`inline-block size-2 rounded-full ${color}`} />
      {label}
      {health && health.status !== 'ok' && (
        <span>
          (postgres {health.checks.postgres ? 'up' : 'down'}, redis{' '}
          {health.checks.redis ? 'up' : 'down'})
        </span>
      )}
    </p>
  )
}
