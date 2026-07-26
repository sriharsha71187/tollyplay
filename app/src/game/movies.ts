export interface Movie {
  id: string
  title: string
  year: number
  director: string
  cast: string[]
  /** Has its own Wikipedia article — popularity proxy. */
  linked: boolean
  /** Wikipedia article title (for poster lookups); null when unlinked. */
  w?: string | null
}

export type LinkRole = 'hero' | 'heroine' | 'director'

let cache: Movie[] | null = null

export async function loadMovies(): Promise<Movie[]> {
  if (cache) return cache
  const res = await fetch(import.meta.env.BASE_URL + 'movies.json')
  cache = (await res.json()) as Movie[]
  return cache
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKC')
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Spacing/punctuation-insensitive identity key for a person, so
 *  'Vijayabhaskar' and 'Vijaya Bhaskar' count as the same link. */
export const personKey = (s: string) => norm(s).replace(/[^a-z0-9]/g, '')

import genders from '../data/genders.json'
const GENDER = genders as Record<string, 'm' | 'f'>

/** People a movie exposes for linking, per enabled roles.
 *  Table convention: cast[0] ≈ hero, cast[1] ≈ heroine — EXCEPT multi-star
 *  films: when `stars` is given and the top two billings are marquee stars
 *  of the same gender (RRR, Seethamma Vakitlo…), both are leads of that
 *  role and the next cast member fills the other role. */
export function linkPeople(
  m: Movie,
  roles: LinkRole[],
  stars?: Set<string>,
): Map<string, string> {
  const out = new Map<string, string>() // person key -> display name
  if (roles.includes('director')) {
    for (const d of m.director.split(',')) {
      const t = d.trim()
      if (t) out.set(personKey(t), t)
    }
  }
  const [a, b] = m.cast
  const starDuo =
    !!stars &&
    !!a &&
    !!b &&
    stars.has(personKey(a)) &&
    stars.has(personKey(b)) &&
    !!GENDER[a] &&
    GENDER[a] === GENDER[b]
  const duoRole: LinkRole = starDuo && GENDER[a] === 'f' ? 'heroine' : 'hero'
  const heroes = starDuo ? [a, b] : [a]
  const other = starDuo ? m.cast[2] : b
  const otherRole: LinkRole = duoRole === 'hero' ? 'heroine' : 'hero'
  if (roles.includes(duoRole)) {
    for (const p of heroes) if (p) out.set(personKey(p), p)
  }
  if (roles.includes(otherRole) && other) out.set(personKey(other), other)
  return out
}

/** Top-2-billed roles needed across the archive to count as a marquee star. */
const STAR_MIN_LEAD_CREDITS = 20

let starCache: { movies: Movie[]; stars: Set<string> } | null = null

/** Marquee stars: people with a big lead filmography (NTR, ANR, Chiranjeevi,
 *  Savitri, Mahesh Babu…). The dataset has no box-office figures, so a star
 *  lead is the popularity proxy. */
export function marqueeStars(movies: Movie[]): Set<string> {
  if (starCache && starCache.movies === movies) return starCache.stars
  const credits = new Map<string, number>()
  for (const m of movies) {
    for (const p of m.cast.slice(0, 2)) {
      if (!p) continue
      const k = personKey(p)
      credits.set(k, (credits.get(k) ?? 0) + 1)
    }
  }
  const stars = new Set<string>()
  for (const [k, n] of credits) if (n >= STAR_MIN_LEAD_CREDITS) stars.add(k)
  starCache = { movies, stars }
  return stars
}

/** Popular = has its own Wikipedia article AND a marquee star in top billing. */
export function isPopular(m: Movie, stars: Set<string>): boolean {
  return m.linked && m.cast.slice(0, 2).some((p) => p && stars.has(personKey(p)))
}

export function searchMovies(movies: Movie[], q: string, limit = 8): Movie[] {
  const nq = norm(q)
  if (nq.length < 2) return []
  const starts: Movie[] = []
  const contains: Movie[] = []
  for (const m of movies) {
    const t = norm(m.title)
    if (t.startsWith(nq)) starts.push(m)
    else if (t.includes(nq)) contains.push(m)
    if (starts.length >= limit) break
  }
  return [...starts, ...contains].slice(0, limit)
}
