import type { RumorStatus } from '@aced/types'
import Link from 'next/link'
import { api } from '@/lib/api'
import { RailCard, railItem } from './RailCard'

const STATUSES: RumorStatus[] = ['open', 'confirmed', 'denied']
const LABEL: Record<RumorStatus, string> = {
  open: 'Open',
  confirmed: 'Confirmed',
  denied: 'Denied',
}
const TONE: Record<RumorStatus, string> = {
  open: 'text-muted',
  confirmed: 'text-success',
  denied: 'text-muted line-through',
}

/** The 4 newest rumors of any status. */
export async function TransferTracker() {
  const pages = await Promise.all(
    STATUSES.map((s) => api.rumors(s, undefined, { cache: 'no-store' }).catch(() => null)),
  )
  if (pages.every((p) => p === null)) return null
  const rumors = pages
    .flatMap((p) => p?.items ?? [])
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4)

  return (
    <RailCard title="Transfer tracker" href="/rumors">
      {rumors.length === 0 ? (
        <p className="py-1 text-meta text-muted">No rumors yet.</p>
      ) : (
        <ul>
          {rumors.map((r) => (
            <li key={r.id} className={railItem}>
              <Link href={`/p/${r.id}`} className="flex flex-col gap-0.5 text-[13px] hover:text-fg">
                <span className="line-clamp-2">{r.title ?? r.body}</span>
                {r.rumorStatus && (
                  <span className={`text-badge ${TONE[r.rumorStatus]}`}>
                    {LABEL[r.rumorStatus]}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </RailCard>
  )
}
