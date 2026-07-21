import type { Movie } from '../game/movies'

/**
 * Real-plot katha rounds: fetch the movie's Wikipedia Plot section and
 * redact giveaway words (title, cast, director) with ▮▮▮.
 */

const cache = new Map<string, string | null>()

function redact(text: string, movie: Movie): string {
  const words = new Set<string>()
  for (const w of movie.title.split(/\s+/)) if (w.length > 3) words.add(w)
  for (const p of [...movie.cast, ...movie.director.split(',')]) {
    for (const w of p.trim().split(/\s+/)) if (w.length > 2) words.add(w)
  }
  let out = text
  for (const w of words) {
    out = out.replace(new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), '▮▮▮')
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
