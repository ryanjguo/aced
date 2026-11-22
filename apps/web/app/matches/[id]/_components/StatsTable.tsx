import type { PlayerMapStat, Team } from '@aced/types'
import Link from 'next/link'

const num = (n: number | null) => (n === null ? '–' : String(Math.round(n)))

export function StatsTable({ team, stats }: { team: Team; stats: PlayerMapStat[] }) {
  const rows = [...stats].sort((a, b) => (b.acs ?? 0) - (a.acs ?? 0))
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] table-fixed text-sm tabular-nums">
        <caption className="sr-only">{team.name} player stats</caption>
        <thead className="text-xs text-muted">
          <tr className="border-b border-border">
            <th scope="col" className="w-[28%] truncate px-4 py-2 text-left font-medium">
              {team.name}
            </th>
            <th scope="col" className="w-[18%] px-2 py-2 text-left font-medium">
              Agent
            </th>
            <th scope="col" className="w-[22%] px-2 py-2 text-right font-medium">
              K / D / A
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              ACS
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              ADR
            </th>
            <th scope="col" className="px-4 py-2 text-right font-medium">
              FK
            </th>
          </tr>
        </thead>
        <tbody className="font-mono whitespace-nowrap">
          {rows.map((s) => (
            <tr key={s.player.id} className="border-b border-border last:border-b-0">
              <th scope="row" className="truncate px-4 py-2 text-left font-sans font-medium">
                <Link href={`/players/${s.player.slug}`} className="hover:underline">
                  {s.player.handle}
                </Link>
              </th>
              <td className="px-2 py-2 font-sans text-muted">{s.agent ?? '–'}</td>
              <td className="px-2 py-2 text-right">
                {s.kills} / {s.deaths} / {s.assists}
              </td>
              <td className="px-2 py-2 text-right">{num(s.acs)}</td>
              <td className="px-2 py-2 text-right">{num(s.adr)}</td>
              <td className="px-4 py-2 text-right">{num(s.firstKills)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
