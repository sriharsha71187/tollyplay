import type { Movie } from './movies'
import { dialogues } from '../content/dialogues'
import { kathas, kathasHard } from '../content/kathas'
import { trivia, triviaHard } from '../content/trivia'
import { mediaEnabled } from '../lib/media'

/** Ek Niranjan — endless trivia. Levels ramp every 6 questions. */

export interface NQuestion {
  kindLabel: string
  prompt: string
  options: string[]
  answer: string
  points: number
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

/** Question factory. `used` prevents repeats within a run. */
export function nextQuestion(
  movies: Movie[],
  qIndex: number,
  used: Set<string>,
  rand: () => number,
): NQuestion | null {
  const level = levelFor(qIndex)
  const points = 10 * level
  const p = pool(movies, level)
  if (p.length < 8) return null

  // Curated warm-up on early levels (until exhausted)
  if (level <= 2) {
    const curated = shuffle(
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
    const c = curated[0]
    if (c) {
      used.add(c.tag)
      const wrong = c.wrong.length
        ? c.wrong
        : distinct(p.map((m) => m.title), c.answer, 3, rand)
      return { kindLabel: c.kind, prompt: c.prompt, options: options4(c.answer, wrong, rand), answer: c.answer, points }
    }
  }

  // Generated questions — unlimited
  const kinds: string[] = ['director', 'hero', 'year', 'costar', 'filmography']
  if (mediaEnabled) kinds.push('duo-photo', 'who-photo')
  for (let attempt = 0; attempt < 25; attempt++) {
    const m = pick(p, rand)
    const kind = pick(kinds, rand)
    const tag = `${kind}:${m.id}`
    if (used.has(tag) || !m.director) continue

    if (kind === 'director') {
      const wrong = distinct(p.map((x) => x.director), m.director, 3, rand)
      if (wrong.length < 3) continue
      used.add(tag)
      return { kindLabel: '🎬 DIRECTOR', prompt: `Who directed ${m.title} (${m.year})?`, options: options4(m.director, wrong, rand), answer: m.director, points }
    }
    if (kind === 'hero' && m.cast[0]) {
      const wrong = distinct(p.map((x) => x.cast[0]).filter(Boolean), m.cast[0], 3, rand)
      if (wrong.length < 3) continue
      used.add(tag)
      return { kindLabel: '⭐ LEAD', prompt: `Who played the lead in ${m.title} (${m.year})?`, options: options4(m.cast[0], wrong, rand), answer: m.cast[0], points }
    }
    if (kind === 'year') {
      const y = m.year
      const offs = shuffle([-7, -5, -4, -3, -2, 2, 3, 4, 5, 7], rand)
      const wrong = [String(y + offs[0]), String(y + offs[1]), String(y + offs[2])]
      used.add(tag)
      return { kindLabel: '📅 YEAR', prompt: `Which year did ${m.title} release?`, options: options4(String(y), wrong, rand), answer: String(y), points }
    }
    if (kind === 'costar' && m.cast.length >= 2) {
      const wrong = distinct(p.map((x) => x.cast[1]).filter(Boolean), m.cast[1], 3, rand)
      if (wrong.length < 3) continue
      used.add(tag)
      return { kindLabel: '🎭 CO-STAR', prompt: `Who starred opposite ${m.cast[0]} in ${m.title} (${m.year})?`, options: options4(m.cast[1], wrong, rand), answer: m.cast[1], points }
    }
    if (kind === 'filmography') {
      const others = p.filter((x) => x.director !== m.director)
      const wrong = distinct(others.map((x) => x.title), m.title, 3, rand)
      if (wrong.length < 3) continue
      used.add(tag)
      return { kindLabel: '🎬 FILMOGRAPHY', prompt: `Which of these was directed by ${m.director}?`, options: options4(m.title, wrong, rand), answer: m.title, points }
    }
    if (kind === 'duo-photo' && m.cast.length >= 2 && m.linked) {
      const others = p.filter((x) => x.id !== m.id)
      const wrong = distinct(others.map((x) => x.title), m.title, 3, rand)
      if (wrong.length < 3) continue
      used.add(tag)
      return {
        kindLabel: '🎞️ CO-STARS',
        prompt: 'Which movie stars BOTH of them?',
        options: options4(m.title, wrong, rand),
        answer: m.title,
        points: points + 5,
        photoPeople: [m.cast[0], m.cast[1]],
      }
    }
    if (kind === 'who-photo' && m.cast[0] && m.linked) {
      const wrong = distinct(p.map((x) => x.cast[0]).filter(Boolean), m.cast[0], 3, rand)
      if (wrong.length < 3) continue
      used.add(tag)
      return {
        kindLabel: '📸 WHO IS THIS',
        prompt: 'Name this star.',
        options: options4(m.cast[0], wrong, rand),
        answer: m.cast[0],
        points: points + 5,
        photoPeople: [m.cast[0]],
      }
    }
  }
  return null
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
