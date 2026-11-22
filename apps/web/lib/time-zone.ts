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
