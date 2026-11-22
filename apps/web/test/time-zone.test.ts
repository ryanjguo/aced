import { describe, expect, it } from 'vitest'
import { startOfToday } from '@/lib/time-zone'

describe('startOfToday', () => {
  const now = new Date('2026-11-22T03:30:00Z')
  it('is midnight UTC in UTC', () => {
    expect(startOfToday('UTC', now).toISOString()).toBe('2026-11-22T00:00:00.000Z')
  })
  it('uses the viewer’s date, which can still be yesterday', () => {
    // 03:30 UTC is 22:30 on Nov 21 in New York (UTC-5).
    expect(startOfToday('America/New_York', now).toISOString()).toBe('2026-11-21T05:00:00.000Z')
  })
  it('handles zones ahead of UTC', () => {
    expect(startOfToday('Asia/Seoul', now).toISOString()).toBe('2026-11-21T15:00:00.000Z')
  })
})
