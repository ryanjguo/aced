import { ApiStatus } from './ApiStatus'

export function SiteFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-[1240px] flex-col gap-2 px-5 pt-6 pb-8 text-xs text-muted">
      <ApiStatus />
      <p>Not affiliated with or endorsed by Riot Games.</p>
    </footer>
  )
}
