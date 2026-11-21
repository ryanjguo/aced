'use client'

import { ApiClientError } from '@aced/api-client'
import type { CreateReportInput, ReportReason } from '@aced/types'
import { usePathname, useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/api-error'
import { authClient } from '@/lib/auth-client'

const REASONS: [ReportReason, string][] = [
  ['spam', 'Spam'],
  ['harassment', 'Harassment'],
  ['misinformation', 'Misinformation'],
  ['rumor_no_source', 'Rumor without a source'],
  ['other', 'Something else'],
]

/** Report action for a post, comment or user; hidden on the viewer's own content. */
export function ReportButton({
  targetType,
  targetId,
  ownerId,
  className,
}: {
  targetType: CreateReportInput['targetType']
  targetId: string
  ownerId?: string | null
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = authClient.useSession()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason>('spam')
  const [note, setNote] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (
    session &&
    (ownerId === session.user.id || (targetType === 'user' && targetId === session.user.id))
  ) {
    return null
  }

  function start() {
    if (!session) {
      router.push(`/signin?from=${encodeURIComponent(pathname)}`)
      return
    }
    setStatus(null)
    setOpen(true)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await api.report({ targetType, targetId, reason, note: note.trim() || undefined })
      setStatus('Thanks, a moderator will take a look.')
    } catch (err) {
      setStatus(
        err instanceof ApiClientError && err.code === 'already_reported'
          ? 'You already reported this.'
          : apiErrorMessage(err),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button variant="link" size="sm" className={className} onClick={start}>
        Report
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Report this {targetType}</DialogTitle>
              <DialogDescription>Moderators review every report.</DialogDescription>
            </DialogHeader>
            <fieldset className="flex flex-col gap-2 text-sm">
              <legend className="sr-only">Reason</legend>
              {REASONS.map(([value, label]) => (
                <label key={value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="reason"
                    value={value}
                    checked={reason === value}
                    onChange={() => setReason(value)}
                    className="accent-accent"
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            <label htmlFor={`report-note-${targetId}`} className="sr-only">
              Note
            </label>
            <Textarea
              id={`report-note-${targetId}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Anything moderators should know? (optional)"
            />
            {status && (
              <p role="status" className="text-sm text-muted">
                {status}
              </p>
            )}
            <DialogFooter>
              {status ? (
                <Button type="button" onClick={() => setOpen(false)}>
                  Done
                </Button>
              ) : (
                <Button type="submit" disabled={busy}>
                  {busy ? 'Sending…' : 'Send report'}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
