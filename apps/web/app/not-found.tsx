import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="font-mono text-5xl font-bold text-accent">404</p>
      <h1 className="text-xl font-semibold">This page whiffed.</h1>
      <p className="text-sm text-muted">It may have moved, been removed, or never existed.</p>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/">Home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/search">Search</Link>
        </Button>
      </div>
    </main>
  )
}
