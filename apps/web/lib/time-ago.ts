const UNITS: [number, string][] = [
  [60, 'm'],
  [24, 'h'],
  [7, 'd'],
  [52, 'w'],
]

/** Compact age like `5m`, `3h`, `2d`, `6w`, `1y`. */
export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, (now - Date.parse(iso)) / 1000)
  if (seconds < 60) return 'now'
  let n = seconds / 60
  for (const [size, unit] of UNITS) {
    if (n < size) return `${Math.floor(n)}${unit}`
    n /= size
  }
  return `${Math.floor(n)}y`
}

/** Compact time until a future instant, same units: `45m`, `2h`, `3d`. */
export const timeUntil = (iso: string, now = Date.now()) =>
  timeAgo(new Date(now).toISOString(), Date.parse(iso))
