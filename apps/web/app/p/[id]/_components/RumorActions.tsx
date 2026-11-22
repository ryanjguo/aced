'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/api-error'
import { authClient } from '@/lib/auth-client'

/** Confirm/deny buttons on open rumors, for moderators. */
export function RumorActions({ postId }: { postId: string }) {
  const router = useRouter()
  const { data } = authClient.useSession()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const role = data?.user.role
  if (role !== 'moderator' && role !== 'admin') return null

  async function resolve(status: 'confirmed' | 'denied') {
    setBusy(true)
    setError(null)
    try {
      await api.resolveRumor(postId, status)
      router.refresh()
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted">Moderator:</span>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => resolve('confirmed')}>
        Confirm rumor
      </Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => resolve('denied')}>
        Deny rumor
      </Button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
}
