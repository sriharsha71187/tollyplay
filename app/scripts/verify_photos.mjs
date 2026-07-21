// Build a VERIFIED actor-photo set for TollyPlay's photo cards.
//
// Problem: photos were resolved at runtime by throwing a raw cast name at
// Wikipedia and showing whatever thumbnail came back — so an ambiguous name
// (e.g. "Krishna") surfaced a deity painting, and unmapped names surfaced
// nothing. This script pre-resolves each name via the batched MediaWiki API,
// keeps ONLY names whose article is (a) a real film person and (b) has a lead
// image, and writes { name: thumbUrl } to src/data/photos.json.
//
// Usage: node scripts/verify_photos.mjs
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'src/data/photos.json')

// --- collect the names that can appear on a photo card ---
const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/movies.json'), 'utf8'))
const movies = Array.isArray(raw) ? raw : raw.movies
const names = new Set()
for (const m of movies) {
  if (!m.linked) continue
  const cast = m.cast || []
  if (cast[0]) names.add(cast[0])
  if (cast[1]) names.add(cast[1]) // co-stars feed duo cards
}
const list = [...names].filter((n) => n && n.length > 1)
console.log(`resolving ${list.length} distinct names…`)

// A film person, per the Wikidata short description or the article intro.
const PERSON = /\b(actor|actress|actresses|film|films|cinema|director|filmmaker|screenwriter|writer|producer|playback|singer|comedian|dancer|choreographer|lyricist|composer|editor|cinematographer|television|artist)\b/i
// Hard rejects even if some film word slips in.
const NOT_PERSON = /\b(deity|god|goddess|emperor|dynasty|temple|city|town|village|district|river|painting|mytholog|epic|festival|novel|newspaper|pageant|beauty contest|disambiguation|refer to)\b/i

const API = 'https://en.wikipedia.org/w/api.php'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function batch(titles, attempt = 0) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    prop: 'pageimages|description|extracts',
    piprop: 'thumbnail',
    pithumbsize: '320',
    exintro: '1',
    explaintext: '1',
    exlimit: '20',
    redirects: '1',
    titles: titles.join('|'),
    origin: '*',
  })
  const res = await fetch(`${API}?${params}`, {
    headers: { 'User-Agent': 'TollyPlay/1.0 (photo verification; family app)' },
  })
  if (res.status === 429 && attempt < 5) {
    const wait = 2000 * (attempt + 1)
    console.log(`  429 — backing off ${wait}ms`)
    await sleep(wait)
    return batch(titles, attempt + 1)
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// resolve input title -> final title through normalized + redirect maps
function chainResolver(query) {
  const step = new Map()
  for (const n of query.normalized ?? []) step.set(n.from, n.to)
  for (const r of query.redirects ?? []) step.set(r.from, r.to)
  return (title) => {
    let t = title
    const seen = new Set()
    while (step.has(t) && !seen.has(t)) {
      seen.add(t)
      t = step.get(t)
    }
    return t
  }
}

const isFilmPerson = (page) => {
  if (!page || page.missing !== undefined) return null
  const thumb = page.thumbnail?.source
  if (!thumb) return null
  // Reject on the SHORT description only — the full extract mentions things
  // like "Film Festival" or "temple town" that would false-reject real actors.
  const desc = page.description ?? ''
  if (NOT_PERSON.test(desc)) return null
  if (!PERSON.test(`${desc} ${page.extract ?? ''}`)) return null
  return thumb
}

/**
 * Resolve each `inputTitle -> query title` pair. Accepts a film-person page and
 * stores its thumb under the ORIGINAL name (so "Nani" gets its photo even
 * though the article is "Nani (actor)"). Returns names that still didn't match.
 */
async function resolvePass(pairs, label) {
  const SIZE = 20 // extracts API caps at 20 titles/request
  const unresolved = []
  for (let i = 0; i < pairs.length; i += SIZE) {
    const chunk = pairs.slice(i, i + SIZE)
    let data
    try {
      data = await batch(chunk.map((p) => p.query))
    } catch (e) {
      console.log(`  [${label}] batch ${i} failed: ${e.message} — retrying later`)
      unresolved.push(...chunk.map((p) => p.name))
      continue
    }
    const q = data.query ?? {}
    const resolve = chainResolver(q)
    const byTitle = new Map()
    for (const p of Object.values(q.pages ?? {})) byTitle.set(p.title, p)
    for (const { name, query } of chunk) {
      const thumb = isFilmPerson(byTitle.get(resolve(query)))
      if (thumb) { result[name] = thumb; verified++ }
      else unresolved.push(name)
    }
    console.log(`  [${label}] ${Math.min(i + SIZE, pairs.length)}/${pairs.length} — verified ${verified}`)
    await sleep(700) // be polite
  }
  return unresolved
}

// Resume: keep anything already verified so transient 429s never regress us,
// and skip re-querying names we've already resolved.
const result = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {}
let verified = Object.keys(result).length
console.log(`resuming with ${verified} already verified`)
const todo = list.filter((n) => !(n in result))

// Pass 1: the bare name. Pass 2/3: retry misses with actor/actress
// disambiguators — many Telugu stars live at "<Name> (actor)".
let rest = await resolvePass(todo.map((n) => ({ name: n, query: n })), 'bare')
for (const suffix of ['(actor)', '(actress)', '(Telugu actor)', '(Telugu actress)']) {
  rest = await resolvePass(rest.map((n) => ({ name: n, query: `${n} ${suffix}` })), suffix)
}
console.log(`\nunmatched after all passes: ${rest.length}`)

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(result, null, 0))
console.log(`\ndone. verified ${verified} of ${list.length}`)
console.log(`wrote ${OUT}`)
