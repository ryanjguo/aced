import { cookies } from 'next/headers'

/** The viewer's time zone from the `tz` cookie (set by `TimeZoneCookie`), or UTC. */
export async function getTimeZone(): Promise<string> {
  const tz = (await cookies()).get('tz')?.value
  if (!tz) return 'UTC'
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return tz
  } catch {
    return 'UTC'
  }
}

/** Midnight today in `tz`, as a UTC instant. */
export function startOfToday(tz: string, now = new Date()) {
  const [y, m, d] = now.toLocaleDateString('en-CA', { timeZone: tz }).split('-').map(Number)
  const guess = Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1)
  // The zone's UTC offset at that moment: how far its wall clock is from UTC.
  const wall = new Date(`${new Date(guess).toLocaleString('en-US', { timeZone: tz })} UTC`)
  return new Date(guess - (wall.getTime() - guess))
}
