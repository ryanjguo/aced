import Link from 'next/link'
import { ApiStatus } from './ApiStatus'

export function SiteFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-[1240px] flex-col gap-2 px-5 pt-6 pb-8 text-xs text-muted">
      <ApiStatus />
      <nav aria-label="Site" className="flex gap-4">
        <Link href="/guidelines" className="hover:text-fg">
          Guidelines
        </Link>
        <Link href="/privacy" className="hover:text-fg">
          Privacy
        </Link>
        <Link href="/terms" className="hover:text-fg">
          Terms
        </Link>
      </nav>
      <p>Not affiliated with or endorsed by Riot Games.</p>
    </footer>
  )
}
