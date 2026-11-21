import type { RumorStatus } from '@aced/types'
import { Badge } from '@/components/ui/badge'

const LABEL: Record<RumorStatus, string> = {
  open: 'Unconfirmed',
  confirmed: 'Confirmed',
  denied: 'Denied',
}

export function RumorBadge({ status }: { status: RumorStatus }) {
  return (
    <Badge
      variant="outline"
      className={
        status === 'confirmed'
          ? 'border-accent text-accent'
          : status === 'denied'
            ? 'border-live text-live'
            : ''
      }
    >
      {LABEL[status]}
    </Badge>
  )
}
