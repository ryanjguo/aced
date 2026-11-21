'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/api-error'
import { authClient } from '@/lib/auth-client'

const action = 'h-auto px-0 text-xs text-muted hover:text-fg'

/** Edit and delete links, shown only to the post's author. */
export function AuthorActions({ postId, authorId }: { postId: string; authorId: string }) {
  const router = useRouter()
  const { data } = authClient.useSession()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (data?.user.id !== authorId) return null

  async function remove() {
    setError(null)
    try {
      await api.deletePost(postId)
      router.refresh()
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't delete the post."))
      setConfirming(false)
    }
  }

  return (
    <>
      <Link href={`/p/${postId}/edit`} className="hover:text-fg">
        Edit
      </Link>
      {confirming ? (
        <span className="flex items-center gap-3">
          Delete this post?
          <Button variant="link" size="sm" className={`${action} text-live`} onClick={remove}>
            Delete
          </Button>
          <Button variant="link" size="sm" className={action} onClick={() => setConfirming(false)}>
            Keep
          </Button>
        </span>
      ) : (
        <Button variant="link" size="sm" className={action} onClick={() => setConfirming(true)}>
          Delete
        </Button>
      )}
      {error && <span className="text-live">{error}</span>}
    </>
  )
}
