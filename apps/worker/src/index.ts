// Ingestion worker: will sync the schedule and poll live series from GRID.
// See the architecture doc, "Data ingestion".

const SYNC_INTERVAL_MS = 15 * 60 * 1000

async function syncSchedule(): Promise<void> {
  console.log(`[worker] schedule sync tick ${new Date().toISOString()}`)
}

await syncSchedule()
setInterval(syncSchedule, SYNC_INTERVAL_MS)
