import { dialogues } from '../content/dialogues'
import { kathas } from '../content/kathas'
import { trivia } from '../content/trivia'

export interface DailyQuestion {
  kind: 'katha' | 'dialogue' | 'trivia'
  prompt: string
  options: string[]
  answer: string
}

/** Puzzle #1 = 2026-07-20. */
const EPOCH_DAY = 20655

export const todayNumber = () =>
  Math.floor(Date.now() / 86_400_000) - EPOCH_DAY + 1

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(arr: T[], n: number, rand: () => number, skip = 0): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(skip, skip + n)
}

const moviePool = [
  ...new Set([...kathas.map((k) => k.movie), ...dialogues.map((d) => d.movie)]),
]

function movieOptions(answer: string, rand: () => number): string[] {
  const wrong = pick(moviePool.filter((m) => m !== answer), 3, rand)
  return pick([answer, ...wrong], 4, rand)
}

/** The same five questions for everyone on a given day. */
export function dailySet(day: number): DailyQuestion[] {
  const rand = mulberry32(day * 2654435761)
  const k = kathas[day % kathas.length]
  const ds = pick(dialogues, 2, rand)
  const ts = pick(trivia, 2, rand)
  return [
    {
      kind: 'katha',
      prompt: k.story,
      options: movieOptions(k.movie, rand),
      answer: k.movie,
    },
    ...ds.map<DailyQuestion>((d) => ({
      kind: 'dialogue',
      prompt: `“${d.text}”`,
      options: movieOptions(d.movie, rand),
      answer: d.movie,
    })),
    ...ts.map<DailyQuestion>((t) => ({
      kind: 'trivia',
      prompt: t.q,
      options: pick([t.answer, ...t.wrong], 4, rand),
      answer: t.answer,
    })),
  ]
}

export interface DailyRecord {
  day: number
  score: number
  streak: number
  best: number
  marks: boolean[]
}

const KEY = 'tollyplay-daily'

export function loadRecord(): DailyRecord | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null')
  } catch {
    return null
  }
}

export function saveResult(score: number, marks: boolean[]): DailyRecord {
  const prev = loadRecord()
  const day = todayNumber()
  const cont = prev && prev.day === day - 1
  const streak = cont ? prev.streak + 1 : 1
  const rec: DailyRecord = {
    day,
    score,
    streak,
    best: Math.max(streak, prev?.best ?? 0),
    marks,
  }
  localStorage.setItem(KEY, JSON.stringify(rec))
  return rec
}

export function shareText(rec: DailyRecord): string {
  const squares = rec.marks.map((m) => (m ? '🟩' : '🟥')).join('')
  return `TollyPlay Daily #${rec.day} — ${rec.score}/5\n${squares}  🔥${rec.streak}`
}
