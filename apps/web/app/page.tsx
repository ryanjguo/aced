import { ApiStatus } from './_components/ApiStatus'

export const dynamic = 'force-dynamic'

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-5xl font-bold tracking-tight">
        aced<span className="text-accent">.</span>
      </h1>
      <p className="text-muted">The VCT community hub.</p>
      <ApiStatus />
      <footer className="fixed bottom-4 text-xs text-muted">
        Not affiliated with or endorsed by Riot Games.
      </footer>
    </main>
  )
}
