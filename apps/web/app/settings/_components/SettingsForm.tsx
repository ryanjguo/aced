'use client'

import { ApiClientError } from '@aced/api-client'
import { useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { authClient } from '@/lib/auth-client'

const BIO_MAX = 280

export function SettingsForm() {
  const router = useRouter()
  const { refetch } = authClient.useSession()
  const [form, setForm] = useState<{ handle: string; bio: string } | null>(null)
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.me().then(
      (me) => setForm({ handle: me.handle, bio: me.bio ?? '' }),
      (err: unknown) => {
        if (err instanceof ApiClientError && err.code === 'unauthorized') {
          router.replace('/signin?from=/settings')
        } else {
          setStatus({ ok: false, message: 'Could not load your settings. Try again later.' })
        }
      },
    )
  }, [router])

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    setSaving(true)
    setStatus(null)
    try {
      const me = await api.updateMe({ handle: form.handle, bio: form.bio.trim() || null })
      setForm({ handle: me.handle, bio: me.bio ?? '' })
      setStatus({ ok: true, message: 'Saved.' })
      refetch()
    } catch (err) {
      const message =
        err instanceof ApiClientError && err.code === 'handle_taken'
          ? 'That handle is taken.'
          : err instanceof ApiClientError && err.code === 'bad_request'
            ? 'Handles are 3–20 letters, numbers or underscores.'
            : 'Could not save. Try again.'
      setStatus({ ok: false, message })
    } finally {
      setSaving(false)
    }
  }

  if (!form) {
    return status ? (
      <p role="alert" className="text-sm text-live">
        {status.message}
      </p>
    ) : (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-9" />
        <Skeleton className="h-24" />
      </div>
    )
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="handle" className="text-sm font-medium">
          Handle
        </label>
        <Input
          id="handle"
          value={form.handle}
          onChange={(e) => setForm({ ...form, handle: e.target.value })}
          minLength={3}
          maxLength={20}
          pattern="[A-Za-z0-9_]+"
          required
          autoComplete="username"
        />
        <p className="text-xs text-muted">3–20 letters, numbers or underscores.</p>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="bio" className="text-sm font-medium">
          Bio
        </label>
        <Textarea
          id="bio"
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          maxLength={BIO_MAX}
          rows={4}
        />
        <p className="text-xs text-muted">
          {form.bio.length}/{BIO_MAX}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        {status && (
          <p role="status" className={`text-sm ${status.ok ? 'text-muted' : 'text-live'}`}>
            {status.message}
          </p>
        )}
      </div>
    </form>
  )
}
