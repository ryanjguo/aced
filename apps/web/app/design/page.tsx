import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { serverApi } from '@/lib/server-api'
import { Specimen } from './_components/Specimen'

/** Admins only, except in local development. Cached so metadata and page check once. */
const canView = cache(async () => {
  if (process.env.NODE_ENV === 'development') return true
  const me = await (await serverApi()).me({ cache: 'no-store' }).catch(() => null)
  return me?.role === 'admin'
})

// Non-admins get the default title too, so nothing reveals that the page exists.
export async function generateMetadata(): Promise<Metadata> {
  return { robots: { index: false }, ...((await canView()) && { title: 'Design system' }) }
}

/** Every token and component from docs/design-system.md, light and dark side by side. */
export default async function DesignPage() {
  if (!(await canView())) notFound()
  return (
    <main className="mx-auto max-w-[1240px] px-4 py-8 md:px-5">
      <h1 className="mb-6 text-page-title">Design system</h1>
      <div className="grid gap-5 lg:grid-cols-2">
        <Specimen theme="light" />
        <Specimen theme="dark" />
      </div>
    </main>
  )
}
