'use client'

import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

/** Text box for new comments, replies and edits. `onSubmit` returns an error message or null. */
export function CommentEditor({
  onSubmit,
  onCancel,
  initial = '',
  submitLabel = 'Comment',
  autoFocus = false,
}: {
  onSubmit: (body: string) => Promise<string | null>
  onCancel?: () => void
  initial?: string
  submitLabel?: string
  autoFocus?: boolean
}) {
  const [body, setBody] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    setBusy(true)
    setError(null)
    setBody('')
    const failed = await onSubmit(text)
    if (failed) {
      setError(failed)
      setBody(text)
    }
    setBusy(false)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <Textarea
        aria-label="Comment"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={10_000}
        placeholder="Markdown supported"
        autoFocus={autoFocus}
        // Start editing at the end of existing text, not the start.
        onFocus={(e) => e.currentTarget.setSelectionRange(body.length, body.length)}
      />
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy || !body.trim()}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
