'use client'

import { type FormEvent, type ReactNode, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

const BAN_DAYS = [1, 7, 30, 365]

/** Asks for a reason (and a ban length) before a remove or ban. */
export function ReasonDialog({
  title,
  trigger,
  ban = false,
  onConfirm,
}: {
  title: string
  trigger: ReactNode
  ban?: boolean
  onConfirm: (reason: string, until?: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [days, setDays] = useState(7)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    const until = ban ? new Date(Date.now() + days * 86_400_000).toISOString() : undefined
    await onConfirm(reason.trim(), until)
    setBusy(false)
    setOpen(false)
    setReason('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>The reason is saved in the mod log.</DialogDescription>
          </DialogHeader>
          <label htmlFor="mod-reason" className="sr-only">
            Reason
          </label>
          <Textarea
            id="mod-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason"
            maxLength={500}
            required
          />
          {ban && (
            <fieldset className="flex flex-wrap gap-2">
              <legend className="mb-2 text-sm">Ban length</legend>
              {BAN_DAYS.map((d) => (
                <Button
                  key={d}
                  type="button"
                  size="sm"
                  variant={days === d ? 'default' : 'outline'}
                  aria-pressed={days === d}
                  onClick={() => setDays(d)}
                >
                  {d === 365 ? '1 year' : `${d} day${d > 1 ? 's' : ''}`}
                </Button>
              ))}
            </fieldset>
          )}
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={busy || !reason.trim()}>
              {busy ? 'Saving…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
