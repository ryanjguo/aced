'use client'

import { Menu } from 'lucide-react'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const LINKS = [
  ['/matches', 'Matches'],
  ['/boards', 'Boards'],
  ['/rumors', 'Rumors'],
  ['/search', 'Search'],
] as const

/** Site navigation for narrow screens, where the header links don't fit. */
export function MobileMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menu"
        className="rounded-md p-1 text-muted hover:text-fg sm:hidden"
      >
        <Menu className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        {LINKS.map(([href, label]) => (
          <DropdownMenuItem key={href} asChild>
            <Link href={href}>{label}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
