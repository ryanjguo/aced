import { describe, expect, it } from 'vitest'
import { toHandle } from '../src/handles.js'

describe('toHandle', () => {
  it.each([
    ['TenZ', 'tenz'],
    ['Ñandú  Player!', 'nandu_player'],
    ['  __x__  ', 'player'],
    ['A very long display name indeed', 'a_very_long_display_'],
  ])('%s → %s', (name, handle) => {
    expect(toHandle(name)).toBe(handle)
  })
})
