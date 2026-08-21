import { kathas, kathasHard } from '../content/kathas'
import { articleViews, realPlotSnippet } from '../lib/plots'
import { isPopular, marqueeStars, type Movie } from './movies'
import {
  loadRecentSecrets,
  rememberSecret,
  storyEraBounds,
  type StoryEra,
} from './room'

/**
 * Katha Trivia — standalone plot-guessing mode. Real Wikipedia plots
 * (names hidden) from FAMOUS movies only, era-filtered, with curated
 * katha one-liners sprinkled in and used as the offline fallback.
 */

export interface PlotQuestion {
  kind: 'real' | 'katha'
  story: string
  title: string
  year: number
  /** Wikipedia article for the reveal poster. */
  w?: string | null
  /** 4 shuffled choices, the answer among them. */
  options: { title: string; year: number }[]
}

function shuffle<T>(a: T[]): T[] {
  const x = [...a]
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[x[i], x[j]] = [x[j], x[i]]
  }
  return x
}

/** Famous movies in the chosen era — same bar as story-mode dealing. */
export function plotPool(movies: Movie[], era: StoryEra): Movie[] {
  const stars = marqueeStars(movies)
  const [lo, hi] = storyEraBounds(era)
  const base = movies.filter((m) => m.cast.length >= 2 && isPopular(m, stars))
  const eraPool = base.filter((m) => m.year >= lo && m.year <= hi)
  // A too-thin era must not stall the game.
  return eraPool.length >= 12 ? eraPool : base
}

/** 3 famous same-era titles that aren't the answer (or each other). */
export function distractors(
  pool: Movie[],
  answerTitle: string,
  n = 3,
): { title: string; year: number }[] {
  const out: { title: string; year: number }[] = []
  for (const m of shuffle(pool)) {
    if (m.title === answerTitle) continue
    if (out.some((o) => o.title === m.title)) continue
    out.push({ title: m.title, year: m.year })
    if (out.length >= n) break
  }
  return out
}

/** Curated one-line katha as a question; also the no-network fallback. */
export function kathaQuestion(
  movies: Movie[],
  era: StoryEra,
  usedTags: Set<string>,
): PlotQuestion | null {
  const [lo, hi] = storyEraBounds(era)
  const pool = plotPool(movies, era)
  const fits = [...kathas, ...kathasHard].filter(
    (k) => k.year >= lo && k.year <= hi && !usedTags.has(`k:${k.movie}`),
  )
  if (!fits.length || pool.length < 4) return null
  const k = fits[Math.floor(Math.random() * fits.length)]
  usedTags.add(`k:${k.movie}`)
  const inArchive = movies.find(
    (m) => m.title === k.movie && Math.abs(m.year - k.year) <= 1,
  )
  return {
    kind: 'katha',
    story: k.story,
    title: k.movie,
    year: k.year,
    w: inArchive?.w ?? null,
    options: shuffle([
      { title: k.movie, year: k.year },
      ...distractors(pool, k.movie),
    ]),
  }
}

/** Deal a real redacted plot from a famous, fresh, era-matching film. */
export async function realPlotQuestion(
  movies: Movie[],
  era: StoryEra,
  usedIds: Set<string>,
): Promise<PlotQuestion | null> {
  const pool = plotPool(movies, era)
  if (pool.length < 4) return null
  const recent = new Set(loadRecentSecrets())
  let fresh = pool.filter((m) => !usedIds.has(m.id) && !recent.has(m.id))
  if (fresh.length < 8) fresh = pool.filter((m) => !usedIds.has(m.id))
  if (!fresh.length) return null
  // Hard budget: a bad network degrades to a curated katha, never a stall.
  const budget = Date.now() + 12_000
  for (let attempt = 0; attempt < 5 && Date.now() < budget; attempt++) {
    const sample = shuffle(fresh).slice(0, 12)
    const views = await articleViews(
      sample.map((m) => m.w).filter((w): w is string => !!w),
    )
    sample.sort(
      (a, b) => (views.get(b.w ?? '') ?? 0) - (views.get(a.w ?? '') ?? 0),
    )
    const pick = sample[Math.floor(Math.random() * Math.min(3, sample.length))]
    usedIds.add(pick.id) // don't retry a dud within this run
    const plot = await realPlotSnippet(pick)
    if (!plot) continue
    rememberSecret(pick.id)
    return {
      kind: 'real',
      story: plot,
      title: pick.title,
      year: pick.year,
      w: pick.w,
      options: shuffle([
        { title: pick.title, year: pick.year },
        ...distractors(pool, pick.title),
      ]),
    }
  }
  return null
}

/** Mostly real plots, a curated katha roughly every 4th question — and
 *  curated always covers for the network. */
export async function nextPlotQuestion(
  movies: Movie[],
  era: StoryEra,
  qIndex: number,
  usedIds: Set<string>,
  usedTags: Set<string>,
): Promise<PlotQuestion | null> {
  if (qIndex % 4 === 3) {
    const k = kathaQuestion(movies, era, usedTags)
    if (k) return k
  }
  const r = await realPlotQuestion(movies, era, usedIds)
  return r ?? kathaQuestion(movies, era, usedTags)
}

// ---- persistence ----
export interface KStats {
  totalPoints: number
  bestRun: number
  runs: number
}

const KEY = 'tp-katha'

export function loadKStats(): KStats {
  try {
    return {
      totalPoints: 0,
      bestRun: 0,
      runs: 0,
      ...JSON.parse(localStorage.getItem(KEY) ?? '{}'),
    }
  } catch {
    return { totalPoints: 0, bestRun: 0, runs: 0 }
  }
}

export function bankKRun(score: number): KStats {
  const s = loadKStats()
  const ns: KStats = {
    totalPoints: s.totalPoints + score,
    bestRun: Math.max(s.bestRun, score),
    runs: s.runs + 1,
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(ns))
  } catch {
    /* stats just don't persist */
  }
  return ns
}
