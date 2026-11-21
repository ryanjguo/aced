import Link from 'next/link'
import { AccountMenu } from './AccountMenu'
import { MobileMenu } from './MobileMenu'

const link = 'hidden text-sm text-muted hover:text-fg sm:inline'

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <nav className="mx-auto flex h-14 max-w-3xl items-center gap-6 px-4">
        <div className="flex items-center gap-3">
          <MobileMenu />
          <Link href="/" className="text-lg font-bold tracking-tight">
            aced<span className="text-accent">.</span>
          </Link>
        </div>
        <Link href="/matches" className={link}>
          Matches
        </Link>
        <Link href="/boards" className={link}>
          Boards
        </Link>
        <Link href="/rumors" className={link}>
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
          <AccountMenu />
        </div>
      </nav>
    </header>
  )
}
