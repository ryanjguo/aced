import Link from 'next/link'
import { api, esportsCache } from '@/lib/api'
import { RailCard } from './RailCard'

const href = { player: 'players', team: 'teams', event: 'events' } as const

/** Most-tagged players, teams and events in the last 24 hours, as mono chips. */
export async function Trending() {
  const trending = await api.trending(esportsCache).catch(() => null)
  if (!trending) return null
  return (
    <RailCard title="Trending">
      {trending.items.length === 0 ? (
        <p className="py-1 text-meta text-muted">Nothing tagged today yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5 pt-1">
          {trending.items.map((t) => (
            <li key={`${t.type}:${t.id}`}>
              <Link
                href={`/${href[t.type]}/${t.slug}`}
                className="block rounded-[10px] bg-surface-2 px-2 py-1 font-mono text-xs transition-colors hover:text-fg"
              >
                {t.type === 'player' ? '@' : '#'}
                {t.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </RailCard>
  )
}
