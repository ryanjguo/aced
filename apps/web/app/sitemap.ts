import type { MetadataRoute } from 'next'
import { api } from '@/lib/api'
import { siteUrl } from '@/lib/site-url'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixed = ['', '/matches', '/boards', '/rumors', '/guidelines', '/privacy', '/terms'].map(
    (path) => ({ url: `${siteUrl}${path}` }),
  )
  const entries = await api.sitemapEntries({ cache: 'no-store' }).catch(() => null)
  if (!entries) return fixed
  const paths = (prefix: string, slugs: string[]) =>
    slugs.map((slug) => ({ url: `${siteUrl}/${prefix}/${encodeURIComponent(slug)}` }))
  return [
    ...fixed,
    ...paths('b', entries.boards),
    ...paths('events', entries.events),
    ...paths('teams', entries.teams),
    ...paths('players', entries.players),
    ...entries.posts.map((p) => ({ url: `${siteUrl}/p/${p.id}`, lastModified: p.updatedAt })),
  ]
}
