// Build a gender map for cast names, so CO-STAR questions can offer distractors
// of the RIGHT gender (a "who starred opposite <hero>" answer is his heroine —
// every option should be an actress, not a random male character actor).
//
// Gender comes from the Wikipedia/Wikidata short description: "actress" -> f,
// "actor" -> m. Ambiguous bare names are retried with (actress)/(actor)
// disambiguators, which also settles the gender. Names we can't classify are
// left OUT — callers must treat unknown as "don't use", never guess.
//
// Resumable. Usage: node scripts/build_genders.mjs
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'src/data/genders.json')

const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/movies.json'), 'utf8'))
const movies = Array.isArray(raw) ? raw : raw.movies
const names = new Set()
for (const m of movies) {
  if (!m.director) continue
  for (const c of (m.cast || []).slice(0, 2)) if (c && c.length > 1) names.add(c)
}
const list = [...names]
console.log(`classifying ${list.length} names…`)

const API = 'https://en.wikipedia.org/w/api.php'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Female first (an "actress" description is unambiguous); "actor" in Indian
// English is used for men. Neutral roles (singer/producer only) stay unknown.
function genderOf(desc) {
  const d = (desc || '').toLowerCase()
  if (/actress/.test(d)) return 'f'
  if (/\bactor\b/.test(d)) return 'm'
  return null
}

async function batch(titles, attempt = 0) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', prop: 'description',
    redirects: '1', titles: titles.join('|'), origin: '*',
  })
  const res = await fetch(`${API}?${params}`, {
    headers: { 'User-Agent': 'TollyPlay/1.0 (gender map; family app)' },
  })
  if (res.status === 429 && attempt < 6) {
    await sleep(4000 * (attempt + 1))
    return batch(titles, attempt + 1)
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function chainResolver(query) {
  const step = new Map()
  for (const n of query.normalized ?? []) step.set(n.from, n.to)
  for (const r of query.redirects ?? []) step.set(r.from, r.to)
  return (title) => {
    let t = title
    const seen = new Set()
    while (step.has(t) && !seen.has(t)) { seen.add(t); t = step.get(t) }
    return t
  }
}

const result = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {}
let classified = Object.keys(result).length
console.log(`resuming with ${classified} already classified`)

async function pass(pairs, label, forceGender) {
  const SIZE = 50
  const unresolved = []
  for (let i = 0; i < pairs.length; i += SIZE) {
    const chunk = pairs.slice(i, i + SIZE)
    let data
    try { data = await batch(chunk.map((p) => p.query)) }
    catch (e) { console.log(`  [${label}] batch ${i}: ${e.message}`); unresolved.push(...chunk.map((p) => p.name)); continue }
    const q = data.query ?? {}
    const resolve = chainResolver(q)
    const byTitle = new Map()
    for (const p of Object.values(q.pages ?? {})) byTitle.set(p.title, p)
    for (const { name, query } of chunk) {
      const page = byTitle.get(resolve(query))
      if (!page || page.missing !== undefined) { unresolved.push(name); continue }
      // On a (actress)/(actor) disambiguation pass, a valid page IS the gender.
      const g = forceGender ?? genderOf(page.description)
      if (g) { result[name] = g; classified++ }
      else unresolved.push(name)
    }
    console.log(`  [${label}] ${Math.min(i + SIZE, pairs.length)}/${pairs.length} — classified ${classified}`)
    await sleep(1000)
  }
  return unresolved
}

const todo = list.filter((n) => !(n in result))
let rest = await pass(todo.map((n) => ({ name: n, query: n })), 'bare')
rest = await pass(rest.map((n) => ({ name: n, query: `${n} (actress)` })), 'actress', 'f')
rest = await pass(rest.map((n) => ({ name: n, query: `${n} (actor)` })), 'actor', 'm')

fs.writeFileSync(OUT, JSON.stringify(result, null, 0))
const f = Object.values(result).filter((g) => g === 'f').length
console.log(`\ndone. classified ${classified} (${f} f / ${classified - f} m), unknown ${rest.length}. wrote ${OUT}`)
