'use client'

import { CalendarDays, House, List, Plus } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

/** Bottom tab bar on phones (doc: Layout); hidden from md up, where the header has the nav. */
export function MobileTabBar() {
  const pathname = usePathname()
  const { data } = authClient.useSession()
  const you = data ? `/u/${data.user.handle}` : `/signin?from=${encodeURIComponent(pathname)}`
  const tab = (href: string, label: string, icon: ReactNode, current: boolean) => (
    <Link
      href={href}
      aria-current={current ? 'page' : undefined}
      className={cn(
        'flex flex-col items-center justify-center gap-1',
        current ? 'font-medium text-fg' : 'text-muted',
      )}
    >
      {icon}
      {label}
    </Link>
  )
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-5 border-t border-border bg-bg text-[11px] md:hidden"
    >
      {tab('/', 'Home', <House className="size-5" />, pathname === '/')}
      {tab(
        '/matches',
        'Matches',
        <CalendarDays className="size-5" />,
        pathname.startsWith('/matches'),
      )}
      {tab(
        '/submit',
        'Post',
        <span className="flex h-7 w-9 items-center justify-center rounded-md bg-btn text-on-btn">
          <Plus className="size-[18px]" />
        </span>,
        pathname === '/submit',
      )}
      {tab(
        '/boards',
        'Boards',
        <List className="size-5" />,
        pathname.startsWith('/boards') || pathname.startsWith('/b/'),
      )}
      {tab(
        you,
        'You',
        <span className="flex size-[22px] items-center justify-center rounded-full bg-surface-2 text-[9px] text-fg">
          {data?.user.handle.slice(0, 2).toUpperCase() ?? '?'}
        </span>,
        pathname.startsWith('/u/') || pathname === '/settings',
      )}
    </nav>
  )
}
