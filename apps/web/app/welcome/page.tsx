import { ApiClientError } from '@aced/api-client'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { api } from '@/lib/api'
import { serverApi } from '@/lib/server-api'
import { TeamPicker } from './_components/TeamPicker'

export const metadata: Metadata = { title: 'Welcome', robots: { index: false } }

/** First-run onboarding. Sign-in returns here; anyone already onboarded goes straight on. */
export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  const { from } = await searchParams
  // Only same-site paths, so the redirect can't be pointed at another site.
  const next = from?.startsWith('/') && !from.startsWith('//') ? from : '/'
  const me = await (await serverApi()).me({ cache: 'no-store' }).catch((err: unknown) => {
    if (err instanceof ApiClientError && err.status === 401) redirect('/signin')
    return null
  })
  if (!me || me.onboardedAt) redirect(next)
  const teams = await api.teams({ cache: 'no-store' }).catch(() => null)
  if (!teams?.items.length) redirect(next)

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-page-title">Pick your teams</h1>
        <p className="text-sm text-muted">
          Their posts land in your Following feed and their live matches in your sidebar. Change
          them any time from a team’s page.
        </p>
      </div>
      <TeamPicker teams={teams.items} next={next} />
    </main>
  )
}
