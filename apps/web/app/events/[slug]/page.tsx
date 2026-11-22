import { ApiClientError } from '@aced/api-client'
import type { Event, EventDetail } from '@aced/types'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { api } from '@/lib/api'
import { MatchList } from '../../matches/_components/MatchList'

type Props = { params: Promise<{ slug: string }> }

const getEvent = cache(async (slug: string): Promise<EventDetail | 'not_found' | null> => {
  try {
    return await api.event(slug, { cache: 'no-store' })
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) return 'not_found'
    return null
  }
})

const day = (iso: string) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))

function dates(event: Event) {
  if (event.startsAt && event.endsAt) return `${day(event.startsAt)} – ${day(event.endsAt)}`
  return event.startsAt ? `From ${day(event.startsAt)}` : null
}

const region = (event: Event) =>
  event.region && event.region.charAt(0).toUpperCase() + event.region.slice(1)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const detail = await getEvent((await params).slug)
  return { title: detail && detail !== 'not_found' ? detail.event.name : 'Event' }
}

export default async function EventPage({ params }: Props) {
  const detail = await getEvent((await params).slug)
  if (detail === 'not_found') notFound()

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {detail ? (
        <>
          <header className="mb-6 flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight">{detail.event.name}</h1>
            <p className="text-sm text-muted">
              {[dates(detail.event), region(detail.event)].filter(Boolean).join(' · ')}
            </p>
          </header>
          <MatchList series={detail.series} />
        </>
      ) : (
        <p role="alert" className="py-12 text-center text-sm text-muted">
          Couldn't load this event. Try again in a moment.
        </p>
      )}
    </main>
  )
}
