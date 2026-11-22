import type { NextConfig } from 'next'

try {
  process.loadEnvFile('../../.env')
} catch {}

const origin = (url: string | undefined) => {
  try {
    return url ? new URL(url).origin : ''
  } catch {
    return ''
  }
}
const dev = process.env.NODE_ENV !== 'production'

// shortcut: scripts allow 'unsafe-inline' because nonces would make every page dynamic
// (no caching for #169); move to nonces or hashes when the policy is enforced.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  // OAuth avatars come from Google's and Discord's CDNs.
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  `connect-src 'self' ${origin(process.env.NEXT_PUBLIC_API_URL)} ${origin(process.env.NEXT_PUBLIC_SENTRY_DSN)}${dev ? ' ws:' : ''}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
]
  .join('; ')
  .replace(/ +/g, ' ')

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // No `preload`: it is hard to undo.
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Report-only until a week passes without violations in the browser console.
          { key: 'Content-Security-Policy-Report-Only', value: csp },
        ],
      },
    ]
  },
}

export default nextConfig
