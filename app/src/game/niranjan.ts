import type { Movie } from './movies'
import { dialogues } from '../content/dialogues'
import { kathas, kathasHard } from '../content/kathas'
import { trivia, triviaHard } from '../content/trivia'
import { hasPhoto, mediaEnabled } from '../lib/media'
import genders from '../data/genders.json'

const GENDER = genders as Record<string, 'm' | 'f'>
const genderOf = (name?: string): 'm' | 'f' | undefined =>
  name ? GENDER[name] : undefined

/** A distractor for `answer` is fine unless we KNOW it's the opposite gender. */
const notOppositeGender = (answer: string) => (n: string) => {
  const g = genderOf(answer)
  const gn = genderOf(n)
  return !(g && gn && gn !== g)
}

/** Ek Niranjan — endless trivia. Levels ramp every 6 questions. */

export interface NQuestion {
  kindLabel: string
  prompt: string
  options: string[]
  answer: string
  points: number
  /** stable identity of this question — used to avoid cross-run repeats */
  tag: string
  /** media builds: show these photos above the prompt */
  photoPeople?: string[]
}

export const LIVES = 3

export const levelFor = (qIndex: number) => Math.min(6, 1 + Math.floor(qIndex / 6))

function shuffle<T>(a: T[], rand: () => number): T[] {
  const x = [...a]
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[x[i], x[j]] = [x[j], x[i]]
  }
  return x
}

function pick<T>(a: T[], rand: () => number): T {
  return a[Math.floor(rand() * a.length)]
}

function pool(movies: Movie[], level: number): Movie[] {
  if (level <= 2)
    return movies.filter((m) => m.linked && m.cast.length >= 2 && m.year >= 1985)
  if (level <= 4) return movies.filter((m) => m.linked && m.cast.length >= 2)
  return movies.filter((m) => m.cast.length >= 1 && !!m.director)
}

function distinct(base: string[], answer: string, n: number, rand: () => number) {
  const out: string[] = []
  for (const c of shuffle(base, rand)) {
    if (c && c !== answer && !out.includes(c)) out.push(c)
    if (out.length >= n) break
  }
  return out
}

function options4(answer: string, wrong: string[], rand: () => number) {
  return shuffle([answer, ...wrong.slice(0, 3)], rand)
}

/**
 * Per-dataset indexes for building believable distractors:
 *  - coLead: person -> the lead partners they've shared top billing with
 *    (a hero's set is his heroines — real, same-era, opposite gender).
 *  - years:  person -> the span of years they were on screen (era matching).
 *  - byGender: recognizable (linked-film) leads split by gender.
 */
interface MovieMeta {
  coLead: Map<string, Set<string>>
  years: Map<string, { lo: number; hi: number }>
  byGender: { m: string[]; f: string[] }
}
let metaCache: { movies: Movie[]; meta: MovieMeta } | null = null

function movieMeta(movies: Movie[]): MovieMeta {
  if (metaCache && metaCache.movies === movies) return metaCache.meta
  const coLead = new Map<string, Set<string>>()
  const years = new Map<string, { lo: number; hi: number }>()
  const famous = { m: new Set<string>(), f: new Set<string>() }
  const link = (a: string, b: string) => {
    if (!coLead.has(a)) coLead.set(a, new Set())
    coLead.get(a)!.add(b)
  }
  for (const mv of movies) {
    const leads = mv.cast.slice(0, 2).filter(Boolean)
    for (const p of leads) {
      const y = years.get(p)
      if (!y) years.set(p, { lo: mv.year, hi: mv.year })
      else {
        if (mv.year < y.lo) y.lo = mv.year
        if (mv.year > y.hi) y.hi = mv.year
      }
      const g = genderOf(p)
      if (g && mv.linked) famous[g].add(p)
    }
    if (leads.length >= 2) {
      link(leads[0], leads[1])
      link(leads[1], leads[0])
    }
  }
  const meta: MovieMeta = {
    coLead,
    years,
    byGender: { m: [...famous.m], f: [...famous.f] },
  }
  metaCache = { movies, meta }
  return meta
}

/**
 * Question factory.
 * - `used` is a hard block: never repeat a question within the same run.
 * - `avoid` is a soft block: skip questions the player saw in recent runs,
 *   but fall back to them rather than run dry. Pass an empty set to disable.
 */
export function nextQuestion(
  movies: Movie[],
  qIndex: number,
  used: Set<string>,
  avoid: Set<string>,
  rand: () => number,
): NQuestion | null {
  const level = levelFor(qIndex)
  const points = 10 * level
  const p = pool(movies, level)
  if (p.length < 8) return null

  // Curated warm-up on early levels (until exhausted)
  if (level <= 2) {
    const remaining = shuffle(
      [
        ...trivia.map((t) => ({ tag: `t:${t.q}`, kind: '🧠 TRIVIA', prompt: t.q, answer: t.answer, wrong: [...t.wrong] })),
        ...dialogues.map((d) => ({ tag: `d:${d.text}`, kind: '💬 DIALOGUE', prompt: `“${d.text}”`, answer: d.movie, wrong: [] as string[] })),
        ...kathas.map((k) => ({ tag: `k:${k.story}`, kind: '📖 KATHA', prompt: k.story, answer: k.movie, wrong: [] as string[] })),
        ...(level >= 2
          ? [
              ...triviaHard.map((t) => ({ tag: `t:${t.q}`, kind: '🧠 TRIVIA', prompt: t.q, answer: t.answer, wrong: [...t.wrong] })),
              ...kathasHard.map((k) => ({ tag: `k:${k.story}`, kind: '📖 KATHA', prompt: k.story, answer: k.movie, wrong: [] as string[] })),
            ]
          : []),
      ].filter((c) => !used.has(c.tag)),
      rand,
    )
    // Serve a curated warm-up the player hasn't seen recently. The curated
    // pool is small (~80), so once every fresh one is spent we DON'T replay a
    // stale one — we fall through to the endless generated questions below.
    // (Old curated cards resurface naturally as they age out of `avoid`.)
    const c = remaining.find((x) => !avoid.has(x.tag))
    if (c) {
      used.add(c.tag)
      const wrong = c.wrong.length
        ? c.wrong
        : distinct(p.map((m) => m.title), c.answer, 3, rand)
      return { kindLabel: c.kind, prompt: c.prompt, options: options4(c.answer, wrong, rand), answer: c.answer, points, tag: c.tag }
    }
  }

  // Generated questions — unlimited
  const kinds: string[] = ['director', 'hero', 'year', 'costar', 'filmography']
  if (mediaEnabled) kinds.push('duo-photo', 'who-photo')
  // First recently-seen question we could build — used only if nothing fresh
  // turns up, so the run never stalls just because the avoid set is large.
  let fallback: NQuestion | null = null
  for (let attempt = 0; attempt < 40; attempt++) {
    const m = pick(p, rand)
    const kind = pick(kinds, rand)
    const tag = `${kind}:${m.id}`
    if (used.has(tag) || !m.director) continue

    let built: NQuestion | null = null
    if (kind === 'director') {
      const wrong = distinct(p.map((x) => x.director), m.director, 3, rand)
      if (wrong.length < 3) continue
      built = { kindLabel: '🎬 DIRECTOR', prompt: `Who directed ${m.title} (${m.year})?`, options: options4(m.director, wrong, rand), answer: m.director, points, tag }
    } else if (kind === 'hero' && m.cast[0]) {
      const src = p.map((x) => x.cast[0]).filter(Boolean).filter(notOppositeGender(m.cast[0]))
      const wrong = distinct(src, m.cast[0], 3, rand)
      if (wrong.length < 3) continue
      built = { kindLabel: '⭐ LEAD', prompt: `Who played the lead in ${m.title} (${m.year})?`, options: options4(m.cast[0], wrong, rand), answer: m.cast[0], points, tag }
    } else if (kind === 'year') {
      const y = m.year
      const offs = shuffle([-7, -5, -4, -3, -2, 2, 3, 4, 5, 7], rand)
      const wrong = [String(y + offs[0]), String(y + offs[1]), String(y + offs[2])]
      built = { kindLabel: '📅 YEAR', prompt: `Which year did ${m.title} release?`, options: options4(String(y), wrong, rand), answer: String(y), points, tag }
    } else if (kind === 'costar' && m.cast.length >= 2) {
      const hero = m.cast[0]
      const ans = m.cast[1]
      const gAns = genderOf(ans)
      const gHero = genderOf(hero)
      // Only a genuine, opposite-gender hero–heroine pairing is a fair question:
      // asking who starred "opposite" the hero means his heroine.
      if (!gAns || !gHero || gAns === gHero) continue
      const meta = movieMeta(movies)
      const inMovie = new Set(m.cast)
      // A usable distractor is the answer's gender, not in this film, not the
      // answer — so an option is never the wrong gender or a co-star giveaway.
      const ok = (n: string) =>
        !!n && n !== ans && !inMovie.has(n) && genderOf(n) === gAns
      const near = (n: string) => {
        const y = meta.years.get(n)
        return !!y && y.hi >= m.year - 10 && y.lo <= m.year + 10
      }
      // Priority: the hero's OTHER leading ladies (real, contemporary), then any
      // same-gender star active in the same era, then a same-gender fallback.
      const heroLadies = [...(meta.coLead.get(hero) ?? [])].filter(ok)
      const contemporaries = meta.byGender[gAns].filter((n) => ok(n) && near(n))
      const anySame = meta.byGender[gAns].filter(ok)
      const wrong: string[] = []
      for (const n of [
        ...shuffle(heroLadies, rand),
        ...shuffle(contemporaries, rand),
        ...shuffle(anySame, rand),
      ]) {
        if (!wrong.includes(n)) wrong.push(n)
        if (wrong.length >= 3) break
      }
      if (wrong.length < 3) continue
      built = { kindLabel: '🎭 CO-STAR', prompt: `Who starred opposite ${hero} in ${m.title} (${m.year})?`, options: options4(ans, wrong, rand), answer: ans, points, tag }
    } else if (kind === 'filmography') {
      const others = p.filter((x) => x.director !== m.director)
      const wrong = distinct(others.map((x) => x.title), m.title, 3, rand)
      if (wrong.length < 3) continue
      built = { kindLabel: '🎬 FILMOGRAPHY', prompt: `Which of these was directed by ${m.director}?`, options: options4(m.title, wrong, rand), answer: m.title, points, tag }
    } else if (kind === 'duo-photo' && m.cast.length >= 2 && m.linked && hasPhoto(m.cast[0]) && hasPhoto(m.cast[1])) {
      const others = p.filter((x) => x.id !== m.id)
      const wrong = distinct(others.map((x) => x.title), m.title, 3, rand)
      if (wrong.length < 3) continue
      built = {
        kindLabel: '🎞️ CO-STARS',
        prompt: 'Which movie stars BOTH of them?',
        options: options4(m.title, wrong, rand),
        answer: m.title,
        points: points + 5,
        tag,
        photoPeople: [m.cast[0], m.cast[1]],
      }
    } else if (kind === 'who-photo' && m.cast[0] && m.linked && hasPhoto(m.cast[0])) {
      const src = p.map((x) => x.cast[0]).filter(Boolean).filter(notOppositeGender(m.cast[0]))
      const wrong = distinct(src, m.cast[0], 3, rand)
      if (wrong.length < 3) continue
      built = {
        kindLabel: '📸 WHO IS THIS',
        prompt: 'Name this star.',
        options: options4(m.cast[0], wrong, rand),
        answer: m.cast[0],
        points: points + 5,
        tag,
        photoPeople: [m.cast[0]],
      }
    }
    if (!built) continue

    used.add(tag)
    if (!avoid.has(tag)) return built
    if (!fallback) fallback = built
  }
  return fallback
}

// ---- recently-seen window (cross-run repeat avoidance) ----
// Rolling list of the most recent question tags a player has been served.
// Kept longer than the curated pool (~110 easy cards) so a whole run's worth
// of warm-ups can pass before any question recurs. Namespaced per user so
// signing in gives that account its own history.
const RECENT_CAP = 160
const recentKey = (uid?: string | null) =>
  `tp-niranjan-recent${uid ? `:${uid}` : ''}`

export function loadRecent(uid?: string | null): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(recentKey(uid)) ?? '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

/** Append a served tag to the player's window, cap it, persist, and return it. */
export function rememberSeen(
  uid: string | null | undefined,
  recent: string[],
  tag: string,
): string[] {
  const next = [...recent, tag]
  const capped = next.length > RECENT_CAP ? next.slice(-RECENT_CAP) : next
  try {
    localStorage.setItem(recentKey(uid), JSON.stringify(capped))
  } catch {
    /* storage full or unavailable — repeat-avoidance just degrades */
  }
  return capped
}

// ---- persistence ----
export interface NStats {
  totalPoints: number
  bestRun: number
  runs: number
}

const KEY = 'tp-niranjan'

export function loadStats(): NStats {
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

export function bankRun(score: number): NStats {
  const s = loadStats()
  const ns: NStats = {
    totalPoints: s.totalPoints + score,
    bestRun: Math.max(s.bestRun, score),
    runs: s.runs + 1,
  }
  localStorage.setItem(KEY, JSON.stringify(ns))
  return ns
}
