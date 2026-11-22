import type { TransferCardData } from '@aced/types'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

export function TransferCard({ data }: { data: TransferCardData }) {
  const team = (t: TransferCardData['from']) =>
    t ? (
      <Link href={`/teams/${t.slug}`} className="relative z-10 hover:underline">
        {t.name}
      </Link>
    ) : (
      <span className="text-muted">Free agent</span>
    )
  return (
    <div className="flex flex-col gap-1 rounded-[10px] bg-surface-2 px-3.5 py-3">
      <p className="text-badge text-muted">Transfer</p>
      <p className="flex flex-wrap items-center gap-2 text-base">
        <Link
          href={`/players/${data.player.slug}`}
          className="relative z-10 font-semibold hover:underline"
        >
          {data.player.handle}
        </Link>
        <span className="flex items-center gap-2 text-sm">
          {team(data.from)}
          <ArrowRight className="size-4 text-muted" aria-label="to" />
          {team(data.to)}
        </span>
      </p>
    </div>
  )
}
