'use client'

import type { EntityResult, TagEntityType, TagRef } from '@aced/types'
import { X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'

export type PickedTag = TagRef & { name: string }

const MAX_TAGS = 10

/** `@name` searches players, `#name` teams and events, plain text everything. */
function parse(text: string): { q: string; types?: TagEntityType[] } {
  if (text.startsWith('@')) return { q: text.slice(1), types: ['player'] }
  if (text.startsWith('#')) return { q: text.slice(1), types: ['team', 'event'] }
  return { q: text }
}

export function TagPicker({
  value,
  onChange,
}: {
  value: PickedTag[]
  onChange: (tags: PickedTag[]) => void
}) {
  const listId = useId()
  const [text, setText] = useState('')
  const [results, setResults] = useState<EntityResult[]>([])
  const [active, setActive] = useState(0)

  useEffect(() => {
    const { q, types } = parse(text.trim())
    if (!q) {
      setResults([])
      return
    }
    // Debounce typing; drop responses for stale queries.
    let stale = false
    const timer = setTimeout(async () => {
      const res = await api.searchEntities(q, types).catch(() => ({ items: [] }))
      if (!stale) {
        setResults(res.items.filter((r) => !value.some((t) => t.type === r.type && t.id === r.id)))
        setActive(0)
      }
    }, 200)
    return () => {
      stale = true
      clearTimeout(timer)
    }
  }, [text, value])

  function add(r: EntityResult) {
    onChange([...value, { type: r.type, id: r.id, name: r.name }])
    setText('')
    setResults([])
  }

  const full = value.length >= MAX_TAGS
  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Selected tags">
          {value.map((t) => (
            <li
              key={`${t.type}:${t.id}`}
              className="flex items-center gap-1 rounded-full border border-border py-0.5 pr-1 pl-2 text-xs"
            >
              {t.type === 'player' ? '@' : '#'}
              {t.name}
              <button
                type="button"
                aria-label={`Remove ${t.name}`}
                onClick={() => onChange(value.filter((v) => v !== t))}
                className="rounded-full p-0.5 text-muted hover:text-fg"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative">
        <Input
          id="tags"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls={listId}
          aria-activedescendant={results.length ? `${listId}-${active}` : undefined}
          autoComplete="off"
          value={text}
          disabled={full}
          placeholder={full ? 'Up to 10 tags' : '@player, #team or #event'}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (!results.length) return
            if (e.key === 'ArrowDown') setActive((a) => (a + 1) % results.length)
            else if (e.key === 'ArrowUp')
              setActive((a) => (a - 1 + results.length) % results.length)
            else if (e.key === 'Enter') {
              const pick = results[active]
              if (pick) add(pick)
            } else if (e.key === 'Escape') setResults([])
            else return
            e.preventDefault()
          }}
        />
        {results.length > 0 && (
          <div
            id={listId}
            role="listbox"
            className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-lg"
          >
            {results.map((r, i) => (
              <div
                key={`${r.type}:${r.id}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                tabIndex={-1}
                // mousedown keeps focus in the input
                onMouseDown={(e) => {
                  e.preventDefault()
                  add(r)
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm ${i === active ? 'bg-secondary' : ''}`}
              >
                <span className="truncate">{r.name}</span>
                <span className="shrink-0 text-xs text-muted">
                  {r.type}
                  {r.detail && ` · ${r.detail}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
