/** Seconds of age worth one order of magnitude of score (12.5 hours). */
export const HOT_DECAY_SECONDS = 45_000
export const HOT_EPOCH_SECONDS = 1_700_000_000

/**
 * Reddit-style hot score: log10 of the score plus a bonus that grows with post time.
 * Mirrored in SQL by the worker's hot-scores job; keep them in sync.
 */
export function hotScore(score: number, createdAt: Date): number {
  const order = Math.log10(Math.max(Math.abs(score), 1))
  const seconds = createdAt.getTime() / 1000 - HOT_EPOCH_SECONDS
  return Math.sign(score) * order + seconds / HOT_DECAY_SECONDS
}
