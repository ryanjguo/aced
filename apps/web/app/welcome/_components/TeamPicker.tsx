'use client'

import type { Region, Team } from '@aced/types'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

const REGIONS: [Region | null, string][] = [
  ['americas', 'Americas'],
  ['emea', 'EMEA'],
  ['pacific', 'Pacific'],
  ['china', 'China'],
  ['international', 'International'],
  [null, 'Other'],
]

/** Team grid grouped by region; Continue follows the picks, Skip follows nothing. */
export function TeamPicker({ teams, next }: { teams: Team[]; next: string }) {
  const router = useRouter()
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(id: string) {
    setPicked((prev) => {
      const set = new Set(prev)
      if (!set.delete(id)) set.add(id)
      return set
    })
  }

  async function finish(ids: string[]) {
    setBusy(true)
    setError(null)
    try {
      await api.finishOnboarding(ids)
      router.replace(next)
      router.refresh()
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't save your teams. Try again."))
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {REGIONS.map(([region, label]) => {
        const group = teams.filter((t) => t.region === region)
        if (group.length === 0) return null
        return (
          <section key={label} className="flex flex-col gap-2">
            <h2 className="text-rail-heading">{label}</h2>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {group.map((t) => {
                const on = picked.has(t.id)
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(t.id)}
                      className={cn(
                        'flex min-h-11 w-full flex-col items-start rounded-md border px-3 py-2 text-left transition-colors',
                        on ? 'border-fg bg-surface-2' : 'border-border hover:bg-surface',
                      )}
                    >
                      <span className="font-mono text-xs text-muted">{t.tag}</span>
                      <span className="truncate text-sm font-medium">{t.name}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button disabled={busy || picked.size === 0} onClick={() => finish([...picked])}>
          {picked.size > 0 ? `Follow ${picked.size} and continue` : 'Continue'}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={() => finish([])}>
          Skip
        </Button>
      </div>
    </div>
  )
}
