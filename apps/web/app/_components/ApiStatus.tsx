import { api } from '@/lib/api'

function getHealth() {
  return api.health({ cache: 'no-store', signal: AbortSignal.timeout(3000) }).catch(() => null)
}

export async function ApiStatus() {
  const health = await getHealth()
  const label = !health ? 'API unreachable' : health.status === 'ok' ? 'All systems ok' : 'Degraded'
  const color = health?.status === 'ok' ? 'bg-accent' : 'bg-muted'

  return (
    <p className="flex items-center justify-center gap-2 text-xs text-muted">
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
