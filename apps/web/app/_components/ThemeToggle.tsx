'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

/** Switches light and dark; the choice is saved by next-themes. */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  // The theme is only known in the browser; render a placeholder until then.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const dark = resolvedTheme === 'dark'
  return (
    <button
      type="button"
      aria-label={mounted ? `Switch to ${dark ? 'light' : 'dark'} theme` : 'Switch theme'}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      className="flex size-11 items-center justify-center rounded-md text-fg transition-colors hover:bg-surface-2 md:size-[34px] md:border md:border-border"
    >
      {mounted && !dark ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </button>
  )
}
