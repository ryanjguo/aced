const SYNC_INTERVAL_MS = 15 * 60 * 1000

async function syncSchedule() {
  console.log(`[worker] schedule sync tick ${new Date().toISOString()}`)
}

await syncSchedule()
setInterval(syncSchedule, SYNC_INTERVAL_MS)
