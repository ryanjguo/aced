'use client'

import type { Series, SeriesStatus } from '@aced/types'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/api-error'
import { authClient } from '@/lib/auth-client'

const STATUSES: SeriesStatus[] = ['scheduled', 'live', 'completed', 'cancelled']
const select = 'h-9 rounded-md border border-input bg-surface px-2 text-sm'

/** Admin-only form to correct a series result; marks it as a manual override. */
export function AdminSeriesFix({ series }: { series: Series }) {
  const router = useRouter()
  const { data } = authClient.useSession()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    scoreA: series.score[0],
    scoreB: series.score[1],
    status: series.status,
    winner: (series.winnerId === series.teamA?.id
      ? 'a'
      : series.winnerId === series.teamB?.id
        ? 'b'
        : null) as 'a' | 'b' | null,
    reason: '',
  })
  const [message, setMessage] = useState<string | null>(null)
  if (data?.user.role !== 'admin') return null

  async function submit(e: FormEvent) {
    e.preventDefault()
    setMessage(null)
    try {
      await api.fixSeries(series.id, form)
      setMessage('Saved. Cards refresh in a few seconds.')
      router.refresh()
    } catch (err) {
      setMessage(apiErrorMessage(err))
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="self-start" onClick={() => setOpen(true)}>
        Correct result (admin)
      </Button>
    )
  }
  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 text-sm"
    >
      <p className="font-medium">Correct result</p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <label htmlFor="fix-score-a">{series.teamA?.tag ?? 'A'}</label>

          <Input
            id="fix-score-a"
            type="number"
            min={0}
            max={5}
            value={form.scoreA}
            onChange={(e) => setForm({ ...form, scoreA: Number(e.target.value) })}
            className="w-16"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="fix-score-b">{series.teamB?.tag ?? 'B'}</label>

          <Input
            id="fix-score-b"
            type="number"
            min={0}
            max={5}
            value={form.scoreB}
            onChange={(e) => setForm({ ...form, scoreB: Number(e.target.value) })}
            className="w-16"
          />
        </div>
        <label className="flex items-center gap-2">
          Status
          <select
            className={select}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as SeriesStatus })}
          >
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          Winner
          <select
            className={select}
            value={form.winner ?? ''}
            onChange={(e) =>
              setForm({ ...form, winner: e.target.value ? (e.target.value as 'a' | 'b') : null })
            }
          >
            <option value="">None</option>
            <option value="a">{series.teamA?.name ?? 'Team A'}</option>
            <option value="b">{series.teamB?.name ?? 'Team B'}</option>
          </select>
        </label>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="fix-reason">Reason</label>

        <Input
          id="fix-reason"
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
          placeholder="e.g. Official score corrected"
          maxLength={500}
          required
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm">
          Save correction
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        {message && (
          <span role="status" className="text-xs text-muted">
            {message}
          </span>
        )}
      </div>
    </form>
  )
}
