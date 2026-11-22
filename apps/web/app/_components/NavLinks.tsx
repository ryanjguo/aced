'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const LINKS = [
  ['/', 'Home'],
  ['/matches', 'Matches'],
  ['/boards', 'Boards'],
  ['/rumors', 'Rumors'],
] as const

/** Header nav; the current section is marked for screen readers and styled. */
export function NavLinks() {
  const pathname = usePathname()
  const current = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 text-[13px] text-muted md:flex">
      {LINKS.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          aria-current={current(href) ? 'page' : undefined}
          className={cn(
            'rounded-sm px-2.5 py-1.5 transition-colors hover:bg-surface-2 hover:text-fg',
            current(href) && 'font-medium text-fg',
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}
