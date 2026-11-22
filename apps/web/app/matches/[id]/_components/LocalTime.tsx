export function LocalTime({ iso, timeZone }: { iso: string; timeZone: string }) {
  const text = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(iso))
  return <time dateTime={iso}>{text}</time>
}
