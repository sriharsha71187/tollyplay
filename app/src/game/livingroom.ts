import type { Movie } from './movies'
import { dialogues } from '../content/dialogues'
import { trivia } from '../content/trivia'

export type ChallengeKind = 'describe' | 'sing' | 'act' | 'trivia' | 'dialogue'

export interface Card {
  kind: ChallengeKind
  /** The answer the team must shout (movie title, or trivia answer). */
  title: string
  year?: number
  /** Words the clue-giver may not say (describe cards). */
  banned: string[]
  /** Read-aloud text: trivia question or famous dialogue. */
  clue?: string
}

export type Era = 'all' | '70s' | '80s' | '90s' | '2000s' | 'modern'

const eraRange: Record<Exclude<Era, 'all'>, [number, number]> = {
  '70s': [1900, 1979],
  '80s': [1980, 1989],
  '90s': [1990, 1999],
  '2000s': [2000, 2012],
  modern: [2013, 2100],
}

function inEra(year: number, era: Era): boolean {
  if (era === 'all') return true
  const [lo, hi] = eraRange[era]
  return year >= lo && year <= hi
}

/** Famous-biased pool: films with their own Wikipedia article and real credits. */
export function cardPool(movies: Movie[], era: Era): Movie[] {
  return movies.filter(
    (m) => m.linked && m.cast.length >= 2 && m.director && inEra(m.year, era),
  )
}

const movieKinds: ChallengeKind[] = [
  'describe', 'describe', 'describe', 'sing', 'sing', 'act', 'act', 'trivia',
]

function bannedWords(m: Movie): string[] {
  const words = new Set<string>()
  for (const p of [...m.cast.slice(0, 2), ...m.director.split(',')]) {
    const first = p.trim().split(' ')[0]
    if (first && first.length > 2) words.add(first)
  }
  for (const w of m.title.split(' ')) {
    if (w.length > 3) words.add(w)
  }
  return [...words].slice(0, 6)
}

function movieCard(m: Movie, rand: () => number): Card {
  const kind = movieKinds[Math.floor(rand() * movieKinds.length)]
  return {
    kind,
    title: m.title,
    year: m.year,
    banned: kind === 'describe' ? bannedWords(m) : [],
    clue:
      kind === 'trivia'
        ? [`${m.year}`, `directed by ${m.director}`,
           m.cast[0] && `starring ${m.cast.slice(0, 2).join(' & ')}`]
            .filter(Boolean)
            .join(' · ')
        : undefined,
  }
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const cardKey = (c: Card) => `${c.kind}|${c.title}|${c.clue ?? ''}`

/**
 * Deck = movie cards (describe/sing/act/auto-trivia) with curated dialogue and
 * trivia cards sprinkled in roughly every 4th card. `used` keys are excluded.
 */
export function buildDeck(
  pool: Movie[],
  count: number,
  era: Era,
  rand: () => number,
  used?: Set<string>,
): Card[] {
  const movieCards = shuffle(pool, rand)
    .slice(0, count)
    .map((m) => movieCard(m, rand))
    .filter((c) => !used?.has(cardKey(c)))
  const curated: Card[] = shuffle(
    [
      ...dialogues
        .filter((d) => inEra(d.year, era))
        .map<Card>((d) => ({
          kind: 'dialogue', title: d.movie, year: d.year, banned: [], clue: d.text,
        })),
      ...trivia.map<Card>((t) => ({
        kind: 'trivia', title: t.answer, banned: [], clue: t.q,
      })),
    ].filter((c) => !used?.has(cardKey(c))),
    rand,
  )
  const deck: Card[] = []
  let c = 0
  for (const card of movieCards) {
    deck.push(card)
    if (deck.length % 4 === 3 && c < curated.length) deck.push(curated[c++])
  }
  return deck.slice(0, count)
}

export const kindMeta: Record<
  ChallengeKind,
  { label: string; icon: string; help: string }
> = {
  describe: {
    label: 'DESCRIBE',
    icon: '🗣️',
    help: 'Tell the story — without the banned words!',
  },
  sing: {
    label: 'SING',
    icon: '🎵',
    help: 'Hum or sing any song from this movie. No title words!',
  },
  act: {
    label: 'ACT',
    icon: '🎭',
    help: 'Dumb charades — not a single word!',
  },
  trivia: {
    label: 'TRIVIA',
    icon: '🧠',
    help: 'Read the clue aloud — team shouts the answer.',
  },
  dialogue: {
    label: 'DIALOGUE',
    icon: '💬',
    help: 'Deliver the dialogue with full feeling — team names the movie!',
  },
}
