import type { SeriesDetail } from '@aced/types'
import { siteUrl } from './site-url'

/** schema.org SportsEvent for a series page, so search engines can show it as a match. */
export function seriesJsonLd(series: SeriesDetail) {
  const team = (t: SeriesDetail['teamA']) =>
    t && { '@type': 'SportsTeam', name: t.name, url: `${siteUrl}/teams/${t.slug}` }
  const name = `${series.teamA?.name ?? 'TBD'} vs ${series.teamB?.name ?? 'TBD'}`
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${name} · ${series.event.name}`,
    startDate: series.scheduledAt,
    eventStatus:
      series.status === 'cancelled'
        ? 'https://schema.org/EventCancelled'
        : 'https://schema.org/EventScheduled',
    url: `${siteUrl}/matches/${series.id}`,
    superEvent: {
      '@type': 'SportsEvent',
      name: series.event.name,
      url: `${siteUrl}/events/${series.event.slug}`,
    },
    competitor: [team(series.teamA), team(series.teamB)].filter(Boolean),
  }
}
