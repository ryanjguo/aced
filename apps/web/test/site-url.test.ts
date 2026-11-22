import { afterEach, describe, expect, it, vi } from 'vitest'

const load = async () => {
  vi.resetModules()
  return (await import('@/lib/site-url')).siteUrl
}

describe('siteUrl', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('prefers NEXT_PUBLIC_SITE_URL, without a trailing slash', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://aced.gg/')
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'aced.vercel.app')
    expect(await load()).toBe('https://aced.gg')
  })

  it("falls back to Vercel's production domain, never localhost on Vercel", async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', undefined)
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'aced.vercel.app')
    expect(await load()).toBe('https://aced.vercel.app')
  })
})
