'use client'

import type { Post } from '@aced/types'
import Link from 'next/link'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/api-error'
import { authClient } from '@/lib/auth-client'
import { PostRow } from './PostRow'

const MAX = 500

/** Quick take box for the home page; new takes show above the feed straight away. */
export function TakeComposer() {
  const { data: session, isPending } = authClient.useSession()
  const [body, setBody] = useState('')
  const [posted, setPosted] = useState<Post[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (isPending) return null
  if (!session) {
    return (
      <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted">
        <Link
          href="/signin?from=%2F"
          className="underline decoration-muted underline-offset-2 hover:decoration-fg"
        >
          Sign in
        </Link>{' '}
        to post your takes.
      </p>
    )
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    setSaving(true)
    setError(null)
    try {
      const post = await api.createPost({ kind: 'take', body: text })
      setPosted((prev) => [post, ...prev])
      setBody('')
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't post your take. Try again."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={submit}
        className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 focus-within:border-ring"
      >
        <Textarea
          aria-label="Your take"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={MAX}
          rows={2}
          placeholder="What's your take?"
          className="resize-none border-0 bg-transparent p-1 focus-visible:ring-0 dark:bg-transparent"
        />
        <div className="flex items-center justify-end gap-3">
          {error && (
            <p role="alert" className="mr-auto text-xs text-danger">
              {error}
            </p>
          )}
          <span
            className={`text-xs tabular-nums ${body.length > MAX - 50 ? 'text-danger' : 'text-muted'}`}
          >
            {MAX - body.length}
          </span>
          <Button type="submit" size="sm" disabled={saving || !body.trim()}>
            {saving ? 'Posting…' : 'Post take'}
          </Button>
        </div>
      </form>
      {posted.length > 0 && (
        <ul
          className="overflow-hidden rounded-lg border border-border bg-surface"
          aria-label="Your new takes"
        >
          {posted.map((p) => (
            <PostRow key={p.id} post={p} />
          ))}
        </ul>
      )}
    </div>
  )
}
