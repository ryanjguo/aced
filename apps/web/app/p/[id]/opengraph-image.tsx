import type { Post } from '@aced/types'
import { ImageResponse } from 'next/og'
import { api } from '@/lib/api'
import { darkColors } from '@/lib/theme-colors'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Aced'

const colors = darkColors

function Body({ post }: { post: Post }) {
  const data = post.data
  if (data?.type === 'result') {
    const team = (name: string, won: boolean) => (
      <div
        style={{
          display: 'flex',
          flex: 1,
          justifyContent: 'center',
          color: won ? colors.fg : colors.muted,
        }}
      >
        {name}
      </div>
    )
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ fontSize: 32, color: colors.muted }}>{data.event.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 64, fontWeight: 700 }}>
          {team(data.teamA.name, data.winner === 'a')}
          <div style={{ display: 'flex', padding: '0 40px', fontSize: 96 }}>
            {data.score[0]} : {data.score[1]}
          </div>
          {team(data.teamB.name, data.winner === 'b')}
        </div>
        <div
          style={{ display: 'flex', justifyContent: 'center', fontSize: 28, color: colors.muted }}
        >
          {data.maps.map((m) => `${m.name} ${m.score[0]}–${m.score[1]}`).join(' · ')}
        </div>
      </div>
    )
  }
  if (data?.type === 'stat_card') {
    const { line } = data
    const stats: [string, string][] = [
      ['K / D / A', `${line.kills} / ${line.deaths} / ${line.assists}`],
      ['ACS', String(line.acs ?? '–')],
      ['ADR', line.adr === null ? '–' : String(Math.round(line.adr))],
    ]
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div style={{ display: 'flex', fontSize: 32, color: colors.muted }}>
          <span style={{ color: colors.fg }}>{data.highlight}</span>
          <span>
            &nbsp;·&nbsp;{data.mapName}
            {data.opponent ? ` vs ${data.opponent.tag}` : ''} · {data.event.name}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
          <span style={{ fontSize: 96, fontWeight: 700 }}>{data.player.handle}</span>
          <span style={{ fontSize: 40, color: colors.muted }}>
            {data.team.tag}
            {line.agent ? ` · ${line.agent}` : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 72 }}>
          {stats.map(([label, value]) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 28, color: colors.muted }}>{label}</span>
              <span style={{ fontSize: 56, fontWeight: 700 }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', fontSize: 64, fontWeight: 700, lineHeight: 1.2 }}>
      {(post.title ?? post.body).slice(0, 120)}
    </div>
  )
}

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const post = await api
    .post((await params).id)
    .then((p) => (p.isRemoved ? null : p))
    .catch(() => null)

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        padding: 72,
        background: colors.bg,
        color: colors.fg,
      }}
    >
      <div style={{ display: 'flex', fontSize: 40, fontWeight: 700 }}>
        aced<span style={{ color: colors.accent }}>.</span>
      </div>
      {post ? (
        <Body post={post} />
      ) : (
        <div style={{ display: 'flex', fontSize: 64 }}>Esports discussion</div>
      )}
      <div style={{ display: 'flex', fontSize: 24, color: colors.muted }}>
        Not affiliated with or endorsed by Riot Games.
      </div>
    </div>,
    size,
  )
}
