import { ApiClientError } from '@aced/api-client'
import type { Profile } from '@aced/types'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { FollowButton } from '@/components/FollowButton'
import { LinkTabs } from '@/components/LinkTabs'
import { ReportButton } from '@/components/ReportButton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { serverApi } from '@/lib/server-api'
import { cn } from '@/lib/utils'
import { ProfileFeed } from './_components/ProfileFeed'

type Props = {
  params: Promise<{ handle: string }>
  searchParams: Promise<{ tab?: string }>
}

const getProfile = cache(async (handle: string): Promise<Profile | 'not_found' | null> => {
  try {
    return await (await serverApi()).user(handle, { cache: 'no-store' })
  } catch (err) {
    if (err instanceof ApiClientError && err.status < 500) return 'not_found'
    return null
  }
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const profile = await getProfile((await params).handle)
  if (!profile || profile === 'not_found') return { title: 'Profile' }
  return {
    title: `@${profile.handle}`,
    description: profile.bio ?? `@${profile.handle}'s posts on Aced.`,
    alternates: { canonical: `/u/${profile.handle}` },
  }
}

const joined = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(iso),
  )

export default async function ProfilePage({ params, searchParams }: Props) {
  const { handle } = await params
  const tab = (await searchParams).tab === 'comments' ? 'comments' : 'posts'
  const api = await serverApi()
  const noStore = { cache: 'no-store' } as const
  const [profile, posts, comments] = await Promise.all([
    getProfile(handle),
    tab === 'posts' ? api.userPosts(handle, undefined, noStore).catch(() => null) : undefined,
    tab === 'comments' ? api.userComments(handle, undefined, noStore).catch(() => null) : undefined,
  ])
  if (profile === 'not_found') notFound()
  if (!profile) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p role="alert" className="py-12 text-center text-sm text-muted">
          Couldn't load this profile. Try again in a moment.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex items-start gap-4">
        <Avatar size="lg">
          <AvatarImage src={profile.avatarUrl ?? undefined} alt="" />
          <AvatarFallback>{profile.handle.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-page-title">@{profile.handle}</h1>
          <p className="text-sm text-muted">
            {profile.karma} karma · joined {joined(profile.createdAt)}
            {profile.role !== 'user' && ` · ${profile.role}`}
          </p>
          {profile.bio && <p className="mt-2 text-sm break-words">{profile.bio}</p>}
          {profile.rumors.posted > 0 && (
            <p className="mt-2 text-xs text-muted">
              Rumors: {profile.rumors.posted} posted · {profile.rumors.confirmed} confirmed
              {profile.rumors.accuracy !== null &&
                ` · ${Math.round(profile.rumors.accuracy * 100)}% accurate`}
              {profile.rumors.credit > 0 && ` · ${profile.rumors.credit} credit`}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <FollowButton type="user" id={profile.id} />
          <ReportButton
            targetType="user"
            targetId={profile.id}
            className="h-auto px-0 text-xs text-muted hover:text-fg"
          />
        </div>
      </header>

      <LinkTabs
        label="Profile sections"
        items={[
          { href: `/u/${profile.handle}`, label: 'Posts', current: tab === 'posts' },
          {
            href: `/u/${profile.handle}?tab=comments`,
            label: 'Comments',
            current: tab === 'comments',
          },
        ]}
      />

      {posts && <ProfileFeed key="posts" handle={profile.handle} tab="posts" initial={posts} />}
      {comments && (
        <ProfileFeed key="comments" handle={profile.handle} tab="comments" initial={comments} />
      )}
      {(posts === null || comments === null) && (
        <p role="alert" className="py-12 text-center text-sm text-muted">
          Couldn't load {tab}.
        </p>
      )}
    </main>
  )
}
