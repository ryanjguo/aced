import Link from 'next/link'
import { api, esportsCache } from '@/lib/api'
import { serverApi } from '@/lib/server-api'

const item =
  'flex items-center justify-between gap-2 rounded-sm px-2 py-1.5 transition-colors hover:bg-surface-2'

/** Home left rail (doc: Layout): your followed teams with live dots, then every board. */
export async function LeftRail() {
  const viewer = await serverApi()
  const [follows, boards, live] = await Promise.all([
    viewer.follows({ cache: 'no-store' }).catch(() => null),
    api.boards(esportsCache).catch(() => null),
    api.series({ status: 'live' }, esportsCache).catch(() => null),
  ])
  const teams = follows?.items.filter((f) => f.type === 'team') ?? []
  const liveTeams = new Set(live?.items.flatMap((s) => [s.teamA?.id, s.teamB?.id]) ?? [])

  return (
    <aside className="hidden max-w-[200px] flex-[1_1_180px] flex-col gap-5 text-[13px] md:flex">
      <section>
        <h2 className="mb-2 text-rail-heading">Your teams</h2>
        {!follows ? (
          <p className="px-2 text-meta text-muted">
            <Link
              href="/signin"
              className="underline decoration-muted underline-offset-2 hover:decoration-fg"
            >
              Sign in
            </Link>{' '}
            to follow teams.
          </p>
        ) : teams.length === 0 ? (
          <p className="px-2 text-meta text-muted">Follow a team from its page.</p>
        ) : (
          <ul>
            {teams.map((t) => (
              <li key={t.id}>
                <Link href={`/teams/${t.slug}`} className={item}>
                  <span className="truncate">{t.name}</span>
                  {liveTeams.has(t.id) && (
                    <>
                      <span className="size-[7px] shrink-0 rounded-full bg-accent" />
                      <span className="sr-only">Live now</span>
                    </>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      {boards && (
        <section>
          <h2 className="mb-2 text-rail-heading">Boards</h2>
          <ul>
            {boards.items.map((b) => (
              <li key={b.id}>
                <Link href={`/b/${b.slug}`} className={item}>
                  {b.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  )
}
