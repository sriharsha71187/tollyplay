import type { Movie } from '../game/movies'

/**
 * Real-plot katha rounds: fetch the movie's Wikipedia Plot section and
 * redact giveaway words (title, cast, director) with ▮▮▮.
 */

const cache = new Map<string, string | null>()

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const LETTERS = ['X', 'Y', 'Z', 'P', 'Q', 'R', 'S', 'T', 'U', 'V']

/**
 * Replace every giveaway (title, character/actor names, director, and — for
 * dubs — the source article title) with consistent quiz-style letters:
 * "X is released from prison … goes in search of his friend Y" instead of a
 * wall of ▮▮▮ bars. One entity = one letter, so the story stays readable.
 * Returns the redaction count — a specificity signal: a passage with no
 * names in it could be any of a hundred movies.
 */
export function redactPlot(
  text: string,
  movie: Movie,
): { out: string; hits: number } {
  // Entity groups: the film itself (title words double as the protagonist's
  // name in half of Telugu cinema), then each cast member, each director.
  const entities: { full: string; words: string[] }[] = []
  const titleWords = [
    ...movie.title.split(/\s+/),
    ...(movie.w ?? '').replace(/\(.*?\)/g, '').split(/\s+/),
  ].filter((w) => w.length > 3)
  if (titleWords.length) entities.push({ full: movie.title, words: titleWords })
  for (const p of [...movie.cast, ...movie.director.split(',')]) {
    const full = p.trim()
    const words = full.split(/\s+/).filter((w) => w.length > 2)
    if (words.length) entities.push({ full, words })
  }
  let out = text
  let hits = 0
  let li = 0
  for (const e of entities) {
    const letter = LETTERS[Math.min(li, LETTERS.length - 1)]
    let matched = false
    // Full name first so "Siddharth Roy" collapses to ONE letter, then the
    // stray single-word mentions.
    for (const pat of [e.full, ...e.words].sort((a, b) => b.length - a.length)) {
      if (pat.length < 3) continue
      out = out.replace(new RegExp(`\\b${esc(pat)}\\b`, 'gi'), () => {
        matched = true
        hits++
        return letter
      })
    }
    if (matched) li++
  }
  return { out, hits }
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
      // Pick the first 3–4 sentence window (within the early plot) that
      // actually names people — a passage with ≥2 redactions is specific to
      // THIS movie; a nameless cold open could be any of a hundred films.
      const sentences = plot.split(/(?<=[.!?])\s+/).slice(0, 10)
      for (let i = 0; i + 3 <= sentences.length && !snippet; i++) {
        let win = sentences.slice(i, i + 4).join(' ')
        if (win.length > 560) win = sentences.slice(i, i + 3).join(' ')
        const { out, hits } = redactPlot(win.slice(0, 560), movie)
        if (hits >= 2 && out.split(/\s+/).length >= 25) snippet = out
      }
    }
  } catch {
    return null // transient — don't cache
  }
  cache.set(article, snippet)
  return snippet
}
