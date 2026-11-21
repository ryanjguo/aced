'use client'

import type { FollowTargetType } from '@aced/types'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { authClient } from '@/lib/auth-client'

export function FollowButton({ type, id }: { type: FollowTargetType; id: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, isPending } = authClient.useSession()
  const [following, setFollowing] = useState<boolean | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!session) return
    api.follows().then(
      ({ items }) => setFollowing(items.some((f) => f.type === type && f.id === id)),
      () => setFollowing(false),
    )
  }, [session, type, id])

  if (isPending || (type === 'user' && session?.user.id === id)) return null

  async function toggle() {
    if (!session) {
      router.push(`/signin?from=${encodeURIComponent(pathname)}`)
      return
    }
    const next = !following
    setFollowing(next)
    setError(false)
    try {
      await (next ? api.follow(type, id) : api.unfollow(type, id))
    } catch {
      setFollowing(!next)
      setError(true)
    }
  }

  return (
    <Button
      size="sm"
      variant={following ? 'outline' : 'default'}
      aria-pressed={following ?? false}
      disabled={session !== null && following === null}
      onClick={toggle}
      title={error ? "Couldn't update. Try again." : undefined}
    >
      {following ? 'Following' : 'Follow'}
    </Button>
  )
}
