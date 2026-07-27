import { linkPeople, type LinkRole, type Movie } from './movies'

export interface ChainSettings {
  roles: LinkRole[]
  turnSeconds: number
  strikesToEliminate: number
}

export const defaultSettings: ChainSettings = {
  roles: ['hero', 'heroine', 'director'],
  turnSeconds: 30,
  strikesToEliminate: 1, // sudden death — miss once and you're out
}

export interface ChainLink {
  movie: Movie
  /** Person shared with the previous movie (display name); null for the opener. */
  via: string | null
  playerIdx: number
  points: number
}

export interface Verdict {
  ok: boolean
  via?: string
  points?: number
  deepCut?: boolean
  reason?: string
}

export function judgeMove(
  prev: Movie,
  next: Movie,
  usedMovies: Set<string>,
  s: ChainSettings,
  /** Marquee stars — lets multi-star films expose both leads for linking. */
  stars?: Set<string>,
): Verdict {
  if (usedMovies.has(next.id)) {
    return { ok: false, reason: `${next.title} is already in the chain` }
  }
  const a = linkPeople(prev, s.roles, stars)
  const b = linkPeople(next, s.roles, stars)
  let via: string | undefined
  for (const [key, display] of b) {
    if (a.has(key)) {
      via = display
      break
    }
  }
  if (!via) {
    return { ok: false, reason: `No shared ${s.roles.join('/')} with ${prev.title}` }
  }
  const deepCut = !next.linked
  return { ok: true, via, points: deepCut ? 3 : 1, deepCut }
}
