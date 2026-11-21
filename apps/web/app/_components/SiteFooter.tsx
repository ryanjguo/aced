import { ApiStatus } from './ApiStatus'

export function SiteFooter() {
  return (
    <footer className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-8 text-center text-xs text-muted">
      <ApiStatus />
      <p>Not affiliated with or endorsed by Riot Games.</p>
    </footer>
  )
}
