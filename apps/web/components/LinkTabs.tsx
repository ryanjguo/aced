import Link from 'next/link'
import { cn } from '@/lib/utils'

/** Doc: Tabs — text tabs over a bottom border; the current one is fg with a crimson underline. */
export function LinkTabs({
  label,
  items,
  className,
}: {
  label: string
  items: { href: string; label: string; current: boolean }[]
  className?: string
}) {
  return (
    <nav aria-label={label} className={cn('flex gap-5 border-b border-border', className)}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.current ? 'page' : undefined}
          className={cn(
            '-mb-px border-b-2 pt-1 pb-2 text-[13px] capitalize transition-colors',
            item.current
              ? 'border-accent font-medium text-fg'
              : 'border-transparent text-muted hover:text-fg',
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
