import { describe, expect, it } from 'vitest'
import { hotScore } from '../src/index.js'

const HOUR = 3_600_000
const now = new Date('2027-01-01T12:00:00Z')
const ago = (hours: number) => new Date(now.getTime() - hours * HOUR)

describe('hotScore', () => {
  it('ranks newer posts higher at equal score', () => {
    expect(hotScore(10, now)).toBeGreaterThan(hotScore(10, ago(1)))
  })

  it('ranks a much higher score above a slightly newer post', () => {
    expect(hotScore(1000, ago(2))).toBeGreaterThan(hotScore(5, now))
  })

  it('lets time win eventually', () => {
    expect(hotScore(1, now)).toBeGreaterThan(hotScore(1000, ago(48)))
  })

  it('ranks downvoted posts below neutral ones', () => {
    expect(hotScore(-10, now)).toBeLessThan(hotScore(0, now))
    expect(hotScore(0, now)).toBe(hotScore(1, now))
  })
})
