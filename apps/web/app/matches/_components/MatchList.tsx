'use client'

import type { Series } from '@aced/types'
import { useEffect, useMemo, useState } from 'react'
import { MatchRow } from './MatchRow'

type Tab = 'upcoming' | 'results'

function dayKey(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

function dayLabel(iso: string, timeZone: string, now: Date) {
  const days =
    (Date.parse(dayKey(iso, timeZone)) - Date.parse(dayKey(now.toISOString(), timeZone))) / 864e5
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso))
}

function timeLabel(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).format(
    new Date(iso),
  )
}

export function MatchList({ series }: { series: Series[] }) {
  const [tab, setTab] = useState<Tab>('upcoming')
  // Render in UTC on the server, then switch to the viewer's time zone after mount.
  const [timeZone, setTimeZone] = useState('UTC')
  useEffect(() => setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone), [])

  const groups = useMemo(() => {
    const now = new Date()
    const picked = series
      .filter((s) =>
        tab === 'upcoming'
          ? s.status === 'scheduled' || s.status === 'live'
          : s.status === 'completed',
      )
      .sort((a, b) => {
        const diff = Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt)
        return tab === 'upcoming' ? diff : -diff
      })

    const byDay = new Map<string, { label: string; items: Series[] }>()
    for (const s of picked) {
      const key = dayKey(s.scheduledAt, timeZone)
      const group = byDay.get(key) ?? { label: dayLabel(s.scheduledAt, timeZone, now), items: [] }
      group.items.push(s)
      byDay.set(key, group)
    }
    return [...byDay.values()]
  }, [series, tab, timeZone])

  return (
    <div>
      <div
        role="tablist"
        className="mb-6 flex gap-1 rounded-lg border border-border bg-surface p-1 text-sm"
      >
        {(['upcoming', 'results'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md px-3 py-1.5 capitalize transition-colors ${
              tab === t ? 'bg-bg text-fg' : 'text-muted hover:text-fg'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">
          {tab === 'upcoming' ? 'No upcoming matches.' : 'No results yet.'}
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((g) => (
            <section key={g.label}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {g.label}
              </h2>
              <ul className="overflow-hidden rounded-lg border border-border bg-surface">
                {g.items.map((s) => (
                  <MatchRow key={s.id} series={s} time={timeLabel(s.scheduledAt, timeZone)} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
