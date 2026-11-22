import { describe, expect, it } from 'vitest'
import { containsBlockedWord } from '../src/index.js'

describe('containsBlockedWord', () => {
  it.each(['you fag', 'F4GG0T', 'r3tard!', 'what a ret@rd', 'some_tranny', 'Fággot', 'n!gger'])(
    'blocks %s',
    (text) => expect(containsBlockedWord(text)).toBe(true),
  )

  it.each(['great play', 'Scunthorpe United', 'spicy take', 'raccoon', 'chinky', 'cocoon', ''])(
    'allows %s',
    (text) => expect(containsBlockedWord(text)).toBe(false),
  )
})
