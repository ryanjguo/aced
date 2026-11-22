import type { StatCardData } from '@aced/types'
import Link from 'next/link'

/** Doc: Stat card — "Stat line · map", player and tag, then mono stat columns. */
export function StatCard({ data }: { data: StatCardData }) {
  const { line } = data
  const stats: [string, string][] = [
    ['K/D/A', `${line.kills}/${line.deaths}/${line.assists}`],
    ['ACS', line.acs === null ? '–' : String(line.acs)],
    ['vs', data.opponent?.tag ?? '–'],
  ]
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[10px] bg-surface-2 px-3.5 py-3">
      <div className="flex min-w-[120px] flex-col gap-0.5">
        <span className="text-badge text-muted">
          Stat line ·{' '}
          <Link href={`/matches/${data.seriesId}`} className="relative z-10 hover:text-fg">
            {data.mapName}
          </Link>{' '}
          · {data.highlight}
        </span>
        <span className="text-base font-semibold">
          <Link href={`/players/${data.player.slug}`} className="relative z-10 hover:underline">
            {data.player.handle}
          </Link>{' '}
          <span className="font-mono text-xs font-normal text-muted">
            {data.team.tag}
            {line.agent && ` · ${line.agent}`}
          </span>
        </span>
      </div>
      <dl className="flex gap-[18px] font-mono text-[13px]">
        {stats.map(([label, value]) => (
          <div key={label} className="flex flex-col">
            <dt className="text-badge text-muted">{label}</dt>
            <dd className="whitespace-nowrap tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
