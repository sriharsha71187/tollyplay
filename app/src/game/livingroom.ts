import type { Movie } from './movies'
import { dialogues } from '../content/dialogues'
import { trivia, triviaHard } from '../content/trivia'
import { hasPhoto, mediaEnabled } from '../lib/media'

export type ChallengeKind =
  | 'describe'
  | 'sing'
  | 'act'
  | 'trivia'
  | 'dialogue'
  | 'duo'

export interface Card {
  kind: ChallengeKind
  /** The answer the team must shout (movie title, or trivia answer). */
  title: string
  year?: number
  /** Words the clue-giver may not say (describe cards). */
  banned: string[]
  /** Read-aloud text: trivia question or famous dialogue. */
  clue?: string
  /** duo cards: [hero, heroine] whose photos are shown to everyone. */
  people?: [string, string]
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

export type Difficulty = 'easy' | 'classic' | 'expert'

/** Pool depth by difficulty: easy = modern famous, classic = all famous,
 *  expert = everything including deep cuts without their own wiki page. */
export function cardPool(movies: Movie[], era: Era, diff: Difficulty): Movie[] {
  return movies.filter((m) => {
    if (!m.director || !inEra(m.year, era)) return false
    if (diff === 'easy') return m.linked && m.cast.length >= 2 && m.year >= 1985
    if (diff === 'classic') return m.linked && m.cast.length >= 2
    return m.cast.length >= 1
  })
}

const movieKinds: ChallengeKind[] = [
  'describe', 'describe', 'describe', 'sing', 'sing', 'act', 'act', 'trivia',
]
const movieKindsWithMedia: ChallengeKind[] = [...movieKinds, 'duo', 'duo']

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

function movieCard(m: Movie, rand: () => number, media: boolean): Card {
  // A duo card is only offered when BOTH co-stars have a verified photo —
  // otherwise the card would show a wrong or missing face.
  const canDuo =
    media && m.cast.length >= 2 && hasPhoto(m.cast[0]) && hasPhoto(m.cast[1])
  const kinds = canDuo ? movieKindsWithMedia : movieKinds
  const kind = kinds[Math.floor(rand() * kinds.length)]
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
    people: kind === 'duo' ? [m.cast[0], m.cast[1]] : undefined,
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
  diff: Difficulty,
  rand: () => number,
  used?: Set<string>,
): Card[] {
  const movieCards = shuffle(pool, rand)
    .slice(0, count)
    .map((m) => movieCard(m, rand, mediaEnabled))
    .filter((c) => !used?.has(cardKey(c)))
  const triviaSet = diff === 'easy' ? trivia : [...trivia, ...triviaHard]
  const curated: Card[] = shuffle(
    [
      ...dialogues
        .filter((d) => inEra(d.year, era))
        .map<Card>((d) => ({
          kind: 'dialogue', title: d.movie, year: d.year, banned: [], clue: d.text,
        })),
      ...triviaSet.map<Card>((t) => ({
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

// `ask` is the bold headline (what the clue-giver must DO); `help` is a small
// secondary hint. Kept separate so the UI can make the ask big and bold.
export const kindMeta: Record<
  ChallengeKind,
  { label: string; icon: string; ask: string; help: string }
> = {
  describe: {
    label: 'DESCRIBE',
    icon: '🗣️',
    ask: 'Describe the plot',
    help: 'No banned words below',
  },
  sing: {
    label: 'SING',
    icon: '🎵',
    ask: 'Sing a song from the film',
    help: 'No words from the title',
  },
  act: {
    label: 'ACT',
    icon: '🎭',
    ask: 'Act it out',
    help: 'Not a single word',
  },
  trivia: {
    label: 'TRIVIA',
    icon: '🧠',
    ask: 'Read the clue aloud',
    help: 'Team shouts the movie',
  },
  dialogue: {
    label: 'DIALOGUE',
    icon: '💬',
    ask: 'Perform this dialogue',
    help: 'Team names the movie',
  },
  duo: {
    label: 'CO-STARS',
    icon: '🎞️',
    ask: 'Name a movie starring BOTH',
    help: 'Show everyone the photos',
  },
}
