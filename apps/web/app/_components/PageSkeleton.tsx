import { Skeleton } from '@/components/ui/skeleton'

/** Placeholder for a page heading and a list of rows while data loads. */
export function PageSkeleton({ rows = 5, header = true }: { rows?: number; header?: boolean }) {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8" aria-busy="true">
      <span className="sr-only">Loading…</span>
      {header && <Skeleton className="h-8 w-48" />}
      {Array.from({ length: rows }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
        <Skeleton key={i} className="h-20" />
      ))}
    </main>
  )
}
