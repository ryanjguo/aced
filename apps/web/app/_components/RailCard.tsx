import Link from 'next/link'
import type { ReactNode } from 'react'

/** Doc: Rail card — bordered, a muted heading with a "See all" link, items split by borders. */
export function RailCard({
  title,
  href,
  children,
}: {
  title: string
  href?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-lg border border-border px-3.5 py-3">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-rail-heading">{title}</h2>
        {href && (
          <Link href={href} className="text-meta text-muted hover:text-fg">
            See all
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

export const railItem = 'border-t border-border py-[7px] first:border-t-0'
