import { Search } from 'lucide-react'
import Link from 'next/link'
import { AccountMenu } from './AccountMenu'

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <nav className="mx-auto flex h-14 max-w-3xl items-center gap-6 px-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          aced<span className="text-accent">.</span>
        </Link>
        <Link href="/matches" className="text-sm text-muted hover:text-fg">
          Matches
        </Link>
        <Link href="/boards" className="text-sm text-muted hover:text-fg">
          Boards
        </Link>
        <Link href="/rumors" className="hidden text-sm text-muted hover:text-fg sm:inline">
          Rumors
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <search className="hidden sm:block">
            <form action="/search">
              <input
                type="search"
                name="q"
                aria-label="Search"
                placeholder="Search"
                className="h-8 w-44 rounded-md border border-input bg-surface px-3 text-sm placeholder:text-muted"
              />
            </form>
          </search>
          <Link href="/search" aria-label="Search" className="text-muted hover:text-fg sm:hidden">
            <Search className="size-5" />
          </Link>
          <AccountMenu />
        </div>
      </nav>
    </header>
  )
}
