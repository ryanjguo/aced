import type { Series, Team } from '@aced/types'

function TeamCell({
  team,
  align,
  won,
  lost,
}: {
  team: Team | null
  align: 'left' | 'right'
  won: boolean
  lost: boolean
}) {
  const tone = won ? 'text-fg font-semibold' : lost ? 'text-muted' : 'text-fg'
  return (
    <div className={`min-w-0 flex-1 truncate ${align === 'right' ? 'text-right' : ''} ${tone}`}>
      {team ? (
        <>
          <span className="sm:hidden">{team.tag}</span>
          <span className="hidden sm:inline">{team.name}</span>
        </>
      ) : (
        <span className="text-muted">TBD</span>
      )}
    </div>
  )
}

export function MatchRow({ series, time }: { series: Series; time: string }) {
  const { teamA, teamB, status, score, winnerId } = series
  const done = status === 'completed'
  const wonA = done && winnerId !== null && winnerId === teamA?.id
  const wonB = done && winnerId !== null && winnerId === teamB?.id

  return (
    <li className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
      <div className="w-14 shrink-0 text-xs text-muted">
        {status === 'live' ? (
          <span className="inline-flex items-center gap-1 font-semibold text-live">
            <span className="size-1.5 animate-pulse rounded-full bg-live" />
            LIVE
          </span>
        ) : (
          time
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="mb-1 truncate text-center text-xs text-muted">{series.event.name}</p>
        <div className="flex min-w-0 items-center gap-3 text-sm">
          <TeamCell team={teamA} align="right" won={wonA} lost={wonB} />
          <div className="w-14 shrink-0 text-center font-mono tabular-nums">
            {status === 'scheduled' ? (
              <span className="text-xs text-muted">Bo{series.bestOf}</span>
            ) : (
              <span>
                <span className={wonB ? 'text-muted' : ''}>{score[0]}</span>
                <span className="text-muted"> : </span>
                <span className={wonA ? 'text-muted' : ''}>{score[1]}</span>
              </span>
            )}
          </div>
          <TeamCell team={teamB} align="left" won={wonB} lost={wonA} />
        </div>
      </div>
    </li>
  )
}
