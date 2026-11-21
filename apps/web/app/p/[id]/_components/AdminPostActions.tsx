'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/api-error'
import { authClient } from '@/lib/auth-client'

/** Admin controls on generated posts: hide a wrong card or rebuild it from current data. */
export function AdminPostActions({ postId, removed }: { postId: string; removed: boolean }) {
  const router = useRouter()
  const { data } = authClient.useSession()
  const [message, setMessage] = useState<string | null>(null)
  if (data?.user.role !== 'admin') return null

  async function run(action: () => Promise<unknown>, done: string) {
    setMessage(null)
    try {
      await action()
      setMessage(done)
      router.refresh()
    } catch (err) {
      setMessage(apiErrorMessage(err))
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted">Admin:</span>
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          run(() => api.regeneratePost(postId), 'Regenerating… refresh in a few seconds.')
        }
      >
        Regenerate
      </Button>
      {!removed && (
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            run(
              () =>
                api.modAction({
                  action: 'remove',
                  targetType: 'post',
                  targetId: postId,
                  reason: 'Incorrect generated post',
                }),
              'Hidden.',
            )
          }
        >
          Hide
        </Button>
      )}
      {message && (
        <span role="status" className="text-xs text-muted">
          {message}
        </span>
      )}
    </div>
  )
}
