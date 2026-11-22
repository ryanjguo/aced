/**
 * The public site origin for canonicals, share images and the sitemap. On Vercel it falls back
 * to the production domain Vercel sets at build time, so it's never localhost in production.
 */
const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? (vercel ? `https://${vercel}` : 'http://localhost:3000')
).replace(/\/$/, '')
