import Link from 'next/link'

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
      </nav>
    </header>
  )
}
