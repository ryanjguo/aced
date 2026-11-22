import { Search } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AccountMenu } from './AccountMenu'
import { NavLinks } from './NavLinks'
import { ThemeToggle } from './ThemeToggle'

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-bg">
      <div className="mx-auto flex h-[52px] max-w-[1240px] items-center gap-2 px-4 md:h-14 md:gap-5 md:px-5">
        <Link href="/" className="text-[19px] font-semibold tracking-tight">
          aced<span className="text-accent">.</span>
        </Link>
        <NavLinks />
        <search className="hidden max-w-[340px] flex-1 md:block">
          <form action="/search">
            <label className="flex h-[34px] items-center gap-2 rounded-md border border-border px-2.5 text-[13px] text-muted focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-fg">
              <Search className="size-4 shrink-0" aria-hidden />
              <input
                type="search"
                name="q"
                aria-label="Search"
                // No browser history dropdown under the box.
                autoComplete="off"
                placeholder="Search players, teams, posts"
                className="w-full bg-transparent text-fg outline-none placeholder:text-muted"
              />
            </label>
          </form>
        </search>
        <div className="ml-auto flex items-center gap-1 md:gap-2">
          <Link
            href="/search"
            aria-label="Search"
            className="flex size-11 items-center justify-center rounded-md hover:bg-surface-2 md:hidden"
          >
            <Search className="size-[18px]" />
          </Link>
          <ThemeToggle />
          <Button asChild className="hidden md:inline-flex">
            <Link href="/submit">Post</Link>
          </Button>
          <div className="hidden md:block">
            <AccountMenu />
          </div>
        </div>
      </div>
    </header>
  )
}
