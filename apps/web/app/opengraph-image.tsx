import { ImageResponse } from 'next/og'
import { darkColors as colors } from '@/lib/theme-colors'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Aced: pro esports matches, stats and discussion'

/** Default share image for pages without their own. */
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        padding: 96,
        gap: 24,
        background: colors.bg,
        color: colors.fg,
      }}
    >
      <div style={{ display: 'flex', fontSize: 140, fontWeight: 700, letterSpacing: -4 }}>
        aced<span style={{ color: colors.accent }}>.</span>
      </div>
      <div style={{ display: 'flex', fontSize: 40, color: colors.muted }}>
        Matches, stats, rumors and discussion for pro esports.
      </div>
    </div>,
    size,
  )
}
