export interface Movie {
  id: string
  title: string
  year: number
  director: string
  cast: string[]
  /** Has its own Wikipedia article — popularity proxy. */
  linked: boolean
}

export type LinkRole = 'hero' | 'heroine' | 'director'

let cache: Movie[] | null = null

export async function loadMovies(): Promise<Movie[]> {
  if (cache) return cache
  const res = await fetch(import.meta.env.BASE_URL + 'movies.json')
  cache = (await res.json()) as Movie[]
  return cache
}

const norm = (s: string) => s.toLowerCase().normalize('NFKC').trim()

/** People a movie exposes for linking, per enabled roles.
 *  Table convention: cast[0] ≈ hero, cast[1] ≈ heroine. */
export function linkPeople(m: Movie, roles: LinkRole[]): Map<string, string> {
  const out = new Map<string, string>() // norm name -> display name
  if (roles.includes('director')) {
    for (const d of m.director.split(',')) {
      const t = d.trim()
      if (t) out.set(norm(t), t)
    }
  }
  if (roles.includes('hero') && m.cast[0]) out.set(norm(m.cast[0]), m.cast[0])
  if (roles.includes('heroine') && m.cast[1]) out.set(norm(m.cast[1]), m.cast[1])
  return out
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
