import type { StatCardData } from '@aced/types'
import Link from 'next/link'

export function StatCard({ data }: { data: StatCardData }) {
  const { line } = data
  const stats: [string, string][] = [
    ['K / D / A', `${line.kills} / ${line.deaths} / ${line.assists}`],
    ['ACS', line.acs === null ? '–' : String(line.acs)],
    ['ADR', line.adr === null ? '–' : String(Math.round(line.adr))],
    ['FK', line.firstKills === null ? '–' : String(line.firstKills)],
  ]
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted">
        <span className="font-medium text-fg">{data.highlight}</span> ·{' '}
        <Link href={`/matches/${data.seriesId}`} className="relative z-10 hover:text-fg">
          {data.mapName}
          {data.opponent && ` vs ${data.opponent.tag}`}
          {data.won !== null && (data.won ? ' (W)' : ' (L)')}
        </Link>
      </p>
      <p className="text-base">
        <Link
          href={`/players/${data.player.slug}`}
          className="relative z-10 font-semibold hover:underline"
        >
          {data.player.handle}
        </Link>{' '}
        <span className="text-muted">
          {data.team.tag}
          {line.agent && ` · ${line.agent}`}
        </span>
      </p>
      <dl className="grid grid-cols-[1.6fr_1fr_1fr_1fr] gap-2">
        {stats.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[11px] text-muted">{label}</dt>
            <dd className="font-mono text-sm whitespace-nowrap tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
