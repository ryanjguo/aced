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
          ? 'border-success text-success'
          : `text-muted ${status === 'denied' ? 'line-through' : ''}`
      }
    >
      {LABEL[status]}
    </Badge>
  )
}
