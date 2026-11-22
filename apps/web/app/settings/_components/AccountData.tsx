'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/api-error'
import { authClient } from '@/lib/auth-client'

const exportUrl = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/me/export`

/** "Your data": download everything as JSON, or delete the account after typing the handle. */
export function AccountData() {
  const router = useRouter()
  const { data: session, refetch } = authClient.useSession()
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const handle = session?.user.handle
  if (!handle) return null

  async function remove(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.deleteMe(confirm)
      await refetch()
      router.replace('/')
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't delete your account. Try again later."))
      setBusy(false)
    }
  }

  return (
    <div className="mt-10 flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-section-title">Your data</h2>
        <p className="text-sm text-muted">
          Your account, posts, comments, votes and follows as a JSON file.
        </p>
        <a href={exportUrl} className={`${buttonVariants({ variant: 'outline' })} self-start`}>
          Download your data
        </a>
      </section>
      <section className="flex flex-col gap-3 rounded-lg border border-danger/40 p-4">
        <h2 className="text-section-title text-danger">Delete account</h2>
        <p className="text-sm text-muted">
          This can't be undone. Your sign-in, votes and follows are removed. Your posts and comments
          stay, without your name, so threads still make sense.
        </p>
        <form onSubmit={remove} className="flex flex-col gap-2">
          <label htmlFor="confirm-delete" className="text-sm">
            Type <span className="font-mono">{handle}</span> to confirm
          </label>
          <Input
            id="confirm-delete"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          {error && (
            <p role="alert" className="text-xs text-danger">
              {error}
            </p>
          )}
          <Button
            type="submit"
            variant="destructive"
            className="self-start"
            disabled={busy || confirm.trim().toLowerCase() !== handle}
          >
            {busy ? 'Deleting…' : 'Delete my account'}
          </Button>
        </form>
      </section>
    </div>
  )
}
