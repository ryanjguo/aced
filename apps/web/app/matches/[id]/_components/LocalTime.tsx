'use client'

import { useEffect, useState } from 'react'

const format = (iso: string, timeZone?: string) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(iso))

/** Renders in UTC on the server, then in the viewer's time zone after mount. */
export function LocalTime({ iso }: { iso: string }) {
  const [text, setText] = useState(() => format(iso, 'UTC'))
  useEffect(() => setText(format(iso)), [iso])
  return <time dateTime={iso}>{text}</time>
}
