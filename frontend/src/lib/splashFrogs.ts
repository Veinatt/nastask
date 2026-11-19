import frogA01 from '@/assets/stickers/frog_a_01.png'
import frogA02 from '@/assets/stickers/frog_a_02.png'
import frogA03 from '@/assets/stickers/frog_a_03.png'
import frogA05 from '@/assets/stickers/frog_a_05.png'
import frogA07 from '@/assets/stickers/frog_a_07.png'
import frogA12 from '@/assets/stickers/frog_a_12.png'
import frogA13 from '@/assets/stickers/frog_a_13.png'
import frogA14 from '@/assets/stickers/frog_a_14.png'
import frogA15 from '@/assets/stickers/frog_a_15.png'
import frogA16 from '@/assets/stickers/frog_a_16.png'
import frogA20 from '@/assets/stickers/frog_a_20.png'
import frogA22 from '@/assets/stickers/frog_a_22.png'
import frogA26 from '@/assets/stickers/frog_a_26.png'
import frogA27 from '@/assets/stickers/frog_a_27.png'
import frogA28 from '@/assets/stickers/frog_a_28.png'
import frogA29 from '@/assets/stickers/frog_a_29.png'
import frogA30 from '@/assets/stickers/frog_a_30.png'
import frogA32 from '@/assets/stickers/frog_a_32.png'
import frogB01 from '@/assets/stickers/frog_b_01.png'
import frogB05 from '@/assets/stickers/frog_b_05.png'
import frogB06 from '@/assets/stickers/frog_b_06.png'
import frogB15 from '@/assets/stickers/frog_b_15.png'
import frogB19 from '@/assets/stickers/frog_b_19.png'
import frogB21 from '@/assets/stickers/frog_b_21.png'
import frogB25 from '@/assets/stickers/frog_b_25.png'
import frogB27 from '@/assets/stickers/frog_b_27.png'

/** Splash sticker pool — ids are stable for the shuffle deck. */
export const SPLASH_FROGS: { id: string; src: string }[] = [
  { id: 'a01', src: frogA01 },
  { id: 'a02', src: frogA02 },
  { id: 'a03', src: frogA03 },
  { id: 'a05', src: frogA05 },
  { id: 'a07', src: frogA07 },
  { id: 'a12', src: frogA12 },
  { id: 'a13', src: frogA13 },
  { id: 'a14', src: frogA14 },
  { id: 'a15', src: frogA15 },
  { id: 'a16', src: frogA16 },
  { id: 'a20', src: frogA20 },
  { id: 'a22', src: frogA22 },
  { id: 'a26', src: frogA26 },
  { id: 'a27', src: frogA27 },
  { id: 'a28', src: frogA28 },
  { id: 'a29', src: frogA29 },
  { id: 'a30', src: frogA30 },
  { id: 'a32', src: frogA32 },
  { id: 'b01', src: frogB01 },
  { id: 'b05', src: frogB05 },
  { id: 'b06', src: frogB06 },
  { id: 'b15', src: frogB15 },
  { id: 'b19', src: frogB19 },
  { id: 'b21', src: frogB21 },
  { id: 'b25', src: frogB25 },
  { id: 'b27', src: frogB27 },
]

const DECK_KEY = 'nastask.splashFrogDeck'

function shuffle<T>(items: T[]): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

function readDeck(): string[] {
  try {
    const raw = localStorage.getItem(DECK_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is string => typeof id === 'string')
  } catch {
    return []
  }
}

function writeDeck(ids: string[]) {
  try {
    localStorage.setItem(DECK_KEY, JSON.stringify(ids))
  } catch {
    // ignore quota / private mode
  }
}

const LAST_KEY = 'nastask.splashFrogLast'

/**
 * Pseudo-random without replacement: shuffle the full pool, deal one id
 * per splash, reshuffle only after every frog has been shown.
 */
export function takeNextSplashFrog(): string {
  const poolIds = SPLASH_FROGS.map((f) => f.id)
  if (poolIds.length === 0) return ''
  const poolSet = new Set(poolIds)
  let deck = readDeck().filter((id) => poolSet.has(id))
  if (deck.length === 0) {
    deck = shuffle(poolIds)
    // Avoid immediately repeating the last frog of the previous cycle
    try {
      const last = localStorage.getItem(LAST_KEY)
      if (last && deck.length > 1 && deck[0] === last) {
        const swap = 1 + Math.floor(Math.random() * (deck.length - 1))
        ;[deck[0], deck[swap]] = [deck[swap], deck[0]]
      }
    } catch {
      // ignore
    }
  }
  const id = deck[0] ?? poolIds[0]
  writeDeck(deck.slice(1))
  try {
    localStorage.setItem(LAST_KEY, id)
  } catch {
    // ignore
  }
  return id
}

export function splashFrogSrc(id: string): string {
  return SPLASH_FROGS.find((f) => f.id === id)?.src ?? SPLASH_FROGS[0]?.src ?? ''
}

/** One pick per page load — survives React StrictMode remount. */
let sessionFrogSrc: string | null = null

export function getSessionSplashFrogSrc(): string {
  if (sessionFrogSrc) return sessionFrogSrc
  sessionFrogSrc = splashFrogSrc(takeNextSplashFrog())
  return sessionFrogSrc
}
