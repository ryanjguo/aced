import type { ResultCardData } from '@aced/types'
import Link from 'next/link'

export function ResultCard({ data }: { data: ResultCardData }) {
  const side = (team: ResultCardData['teamA'], won: boolean) => (
    <Link
      href={`/teams/${team.slug}`}
      className={`relative z-10 min-w-0 flex-1 truncate hover:underline ${won ? 'font-semibold' : 'text-muted'}`}
    >
      {team.name}
    </Link>
  )
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted">
        Result ·{' '}
        <Link href={`/events/${data.event.slug}`} className="relative z-10 hover:text-fg">
          {data.event.name}
        </Link>
      </p>
      <div className="flex items-center gap-3 text-base">
        <div className="flex min-w-0 flex-1 justify-end text-right">
          {side(data.teamA, data.winner === 'a')}
        </div>
        <Link
          href={`/matches/${data.seriesId}`}
          className="relative z-10 shrink-0 font-mono text-xl tabular-nums hover:underline"
        >
          {data.score[0]} : {data.score[1]}
        </Link>
        <div className="flex min-w-0 flex-1">{side(data.teamB, data.winner === 'b')}</div>
      </div>
      {data.maps.length > 0 && (
        <p className="text-center text-xs text-muted">
          {data.maps.map((m) => `${m.name} ${m.score[0]}–${m.score[1]}`).join(' · ')}
        </p>
      )}
    </div>
  )
}
