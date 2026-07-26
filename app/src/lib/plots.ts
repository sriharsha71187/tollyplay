import type { Movie } from '../game/movies'

/**
 * Real-plot katha rounds: fetch the movie's Wikipedia Plot section and
 * redact giveaway words (title, cast, director) with ▮▮▮.
 */

const cache = new Map<string, string | null>()

function redact(text: string, movie: Movie): string {
  const words = new Set<string>()
  for (const w of movie.title.split(/\s+/)) if (w.length > 3) words.add(w)
  // Dubbed films: the source article's title (e.g. Padayappa for Narasimha)
  // shows up in the plot as the protagonist's name — blank it too.
  for (const w of (movie.w ?? '').replace(/\(.*?\)/g, '').split(/\s+/))
    if (w.length > 3) words.add(w)
  for (const p of [...movie.cast, ...movie.director.split(',')]) {
    for (const w of p.trim().split(/\s+/)) if (w.length > 2) words.add(w)
  }
  let out = text
  for (const w of words) {
    out = out.replace(new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), '▮▮▮')
  }
  return out
}

/** 60-day Wikipedia pageview totals per article, one batched request.
 *  The fame signal for dealing movies people have actually heard of.
 *  Failures resolve to 0 (uncached), so callers degrade to unranked order. */
const viewsCache = new Map<string, number>()

export async function articleViews(
  articles: string[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  const need: string[] = []
  for (const a of articles) {
    const hit = viewsCache.get(a)
    if (hit !== undefined) out.set(a, hit)
    else need.push(a)
  }
  if (!need.length) return out
  try {
    const res = await fetch(
      'https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=pageviews&redirects=1&titles=' +
        encodeURIComponent(need.join('|')),
    )
    const d = await res.json()
    const q = d?.query ?? {}
    // Requested titles can be renamed (normalization, then a redirect)
    // before they match a page — follow the chain forward.
    const step = new Map<string, string>()
    for (const r of [...(q.normalized ?? []), ...(q.redirects ?? [])] as {
      from: string
      to: string
    }[])
      step.set(r.from, r.to)
    const byTitle = new Map<string, number>()
    for (const page of Object.values(q.pages ?? {}) as {
      title?: string
      pageviews?: Record<string, number | null>
    }[]) {
      let sum = 0
      for (const v of Object.values(page.pageviews ?? {})) sum += v ?? 0
      if (page.title) byTitle.set(page.title, sum)
    }
    for (const a of need) {
      let t = a
      for (let i = 0; i < 3 && step.has(t); i++) t = step.get(t)!
      const v = byTitle.get(t) ?? 0
      viewsCache.set(a, v)
      out.set(a, v)
    }
  } catch {
    for (const a of need) out.set(a, 0) // transient — don't cache
  }
  return out
}

export async function realPlotSnippet(movie: Movie): Promise<string | null> {
  const article = movie.w
  if (!article) return null
  if (cache.has(article)) return cache.get(article)!
  let snippet: string | null = null
  try {
    const res = await fetch(
      'https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=extracts&explaintext=1&redirects=1&titles=' +
        encodeURIComponent(article),
    )
    const d = await res.json()
    const pages = d?.query?.pages ?? {}
    const page = Object.values(pages)[0] as { extract?: string } | undefined
    const full = page?.extract ?? ''
    const m = full.match(/==\s*(Plot|Plot summary|Synopsis|Story|Storyline)\s*==\n+([\s\S]*?)(\n==|$)/i)
    if (m) {
      const plot = m[2].trim()
      // first few sentences, capped
      const sentences = plot.split(/(?<=[.!?])\s+/).slice(0, 3).join(' ')
      if (sentences.split(/\s+/).length >= 20) {
        snippet = redact(sentences.slice(0, 420), movie)
      }
    }
  } catch {
    return null // transient — don't cache
  }
  cache.set(article, snippet)
  return snippet
}
