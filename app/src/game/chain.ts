import { linkPeople, type LinkRole, type Movie } from './movies'

export interface ChainSettings {
  roles: LinkRole[]
  /** Max times one person can be the link in a game. */
  personLimit: number
  turnSeconds: number
  strikesToEliminate: number
}

export const defaultSettings: ChainSettings = {
  roles: ['hero', 'heroine', 'director'],
  personLimit: 3,
  turnSeconds: 30,
  strikesToEliminate: 2,
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
  personUse: Map<string, number>,
  s: ChainSettings,
): Verdict {
  if (usedMovies.has(next.id)) {
    return { ok: false, reason: `${next.title} is already in the chain` }
  }
  const a = linkPeople(prev, s.roles)
  const b = linkPeople(next, s.roles)
  let via: string | undefined
  let exhausted: string | undefined
  for (const [key, display] of b) {
    if (!a.has(key)) continue
    if ((personUse.get(key) ?? 0) >= s.personLimit) {
      exhausted = display
      continue
    }
    via = display
    break
  }
  if (!via) {
    if (exhausted) {
      return { ok: false, reason: `${exhausted} is exhausted (${s.personLimit} links max)` }
    }
    return { ok: false, reason: `No shared ${s.roles.join('/')} with ${prev.title}` }
  }
  const deepCut = !next.linked
  return { ok: true, via, points: deepCut ? 3 : 1, deepCut }
}

export function recordMove(
  verdict: Verdict,
  next: Movie,
  usedMovies: Set<string>,
  personUse: Map<string, number>,
) {
  usedMovies.add(next.id)
  if (verdict.via) {
    const key = verdict.via.toLowerCase().normalize('NFKC').trim()
    personUse.set(key, (personUse.get(key) ?? 0) + 1)
  }
}
