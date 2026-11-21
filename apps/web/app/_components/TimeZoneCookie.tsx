'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/** Stores the browser's time zone so server components can render local times. */
export function TimeZoneCookie() {
  const router = useRouter()
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (document.cookie.split('; ').includes(`tz=${encodeURIComponent(tz)}`)) return
    // biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API isn't in every browser we support
    document.cookie = `tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`
    // First visit rendered in UTC; re-render once with the new cookie.
    router.refresh()
  }, [router])
  return null
}
