import type { Movie } from './movies'

export type ChallengeKind = 'describe' | 'sing' | 'act' | 'trivia'

export interface Card {
  kind: ChallengeKind
  movie: Movie
  /** Words the clue-giver may not say (describe cards). */
  banned: string[]
  /** Pre-built clue text (trivia cards). */
  clue?: string
}

export type Era = 'all' | '70s' | '80s' | '90s' | '2000s' | 'modern'

const eraRange: Record<Exclude<Era, 'all'>, [number, number]> = {
  '70s': [1960, 1979],
  '80s': [1980, 1989],
  '90s': [1990, 1999],
  '2000s': [2000, 2012],
  modern: [2013, 2100],
}

/** Famous-biased pool: films with their own Wikipedia article and real credits. */
export function cardPool(movies: Movie[], era: Era): Movie[] {
  return movies.filter((m) => {
    if (!m.linked || m.cast.length < 2 || !m.director) return false
    if (era === 'all') return true
    const [lo, hi] = eraRange[era]
    return m.year >= lo && m.year <= hi
  })
}

const kinds: ChallengeKind[] = [
  'describe', 'describe', 'describe', 'sing', 'sing', 'act', 'act', 'trivia', 'trivia',
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

function triviaClue(m: Movie): string {
  const parts = [`${m.year}`, `directed by ${m.director}`]
  if (m.cast[0]) parts.push(`starring ${m.cast.slice(0, 2).join(' & ')}`)
  return parts.join(' · ')
}

/** Deterministic-ish shuffle seeded by an external random source. */
export function buildDeck(pool: Movie[], count: number, rand: () => number): Card[] {
  const picked = [...pool]
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[picked[i], picked[j]] = [picked[j], picked[i]]
  }
  return picked.slice(0, count).map((movie) => {
    const kind = kinds[Math.floor(rand() * kinds.length)]
    return {
      kind,
      movie,
      banned: kind === 'describe' ? bannedWords(movie) : [],
      clue: kind === 'trivia' ? triviaClue(movie) : undefined,
    }
  })
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
    help: 'Read the clue aloud — team names the movie.',
  },
}
