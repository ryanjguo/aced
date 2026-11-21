// Starter list; extend as moderators find gaps. Entries are normalised (see `normalise`).
const BLOCKED = new Set([
  'nigger',
  'niggers',
  'nigga',
  'niggas',
  'faggot',
  'faggots',
  'fag',
  'fags',
  'retard',
  'retards',
  'tranny',
  'trannies',
  'kike',
  'kikes',
  'spic',
  'spics',
  'chink',
  'chinks',
  'gook',
  'gooks',
  'wetback',
  'wetbacks',
  'coon',
  'coons',
])

const SWAPS: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '!': 'i',
  '|': 'i',
  '3': 'e',
  '4': 'a',
  '@': 'a',
  '5': 's',
  $: 's',
  '7': 't',
}

/** Lowercases, strips accents and maps common character swaps (`n1gg3r` → `nigger`). */
export function normalise(word: string): string {
  const plain = word
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    // Edge punctuation is punctuation (`r3tard!`); inside a word it's a swap (`n!gger`).
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
  return [...plain]
    .map((c) => SWAPS[c] ?? c)
    .join('')
    .replace(/[^a-z]/g, '')
}

/** True if any word in the text is on the blocked list. Matches whole words to avoid false positives. */
export function containsBlockedWord(text: string): boolean {
  return text.split(/[\s_\-.,;:/]+/).some((word) => BLOCKED.has(normalise(word)))
}
