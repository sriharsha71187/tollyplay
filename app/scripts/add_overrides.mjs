// Curated photo overrides for high-frequency stars whose BARE dataset name is
// ambiguous on Wikipedia (e.g. "Rajendra Prasad" = India's first President;
// "Krishna" = the deity). Each entry maps the dataset's cast string to one or
// more candidate article titles; the FIRST candidate that verifies as a film
// person with a lead image wins. Verification still gates everything, so a
// wrong guess is simply dropped — never shown. Merges into src/data/photos.json.
//
// Usage: node scripts/add_overrides.mjs
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'src/data/photos.json')

// dataset cast string -> ordered candidate Wikipedia article titles
const OVERRIDES = {
  'Rajendra Prasad': ['Rajendra Prasad (actor)'],
  Krishna: ['Krishna (Telugu actor)'],
  Srikanth: ['Srikanth (Telugu actor)'],
  Nagarjuna: ['Nagarjuna (actor)'],
  Venkatesh: ['Venkatesh (actor)', 'Daggubati Venkatesh'],
  'Sobhan Babu': ['Sobhan Babu'],
  Savitri: ['Savitri (actress)'],
  Soundarya: ['Soundarya (actress)', 'Soundarya'],
  'Chandra Mohan': ['Chandra Mohan (Telugu actor)'],
  'Krishna Kumari': ['Krishna Kumari (actress)'],
  Sivaji: ['Sivaji (actor)'],
  Naresh: ['Naresh (actor)'],
  Gopichand: ['Gopichand (actor)'],
  Jaggayya: ['Jaggayya'],
  Tarun: ['Tarun Kumar (Telugu actor)', 'Tarun (actor)'],
  'Raj Tarun': ['Raj Tarun'],
  Gummadi: ['Gummadi Venkateswara Rao'],
  'Radikaa Sarathkumar': ['Radikaa Sarathkumar'],
  'Nikhil Siddhartha': ['Nikhil Siddhartha'],
  'Vadde Naveen': ['Vadde Naveen'],
  'V. Nagayya': ['Chittor V. Nagaiah'],
  Devika: ['Devika (actress)'],
  Raasi: ['Raasi (actress)'],
  Sarada: ['Sharada (actress)'],
  Rajasulochana: ['Rajasulochana'],
  Raja: ['Raja (Telugu actor)'],
  Rajani: ['Rajani (actress)'],
  Lakshmi: ['Lakshmi (actress)'],
  'Hebah Patel': ['Hebah Patel'],
  Suhas: ['Suhas (actor)'],
  'Sivaji Raja': ['Sivaji Raja'],
}

const PERSON = /\b(actor|actress|actresses|film|films|cinema|director|filmmaker|screenwriter|writer|producer|playback|singer|comedian|dancer|choreographer|lyricist|composer|editor|cinematographer|television|artist)\b/i
const NOT_PERSON = /\b(deity|god|goddess|emperor|dynasty|temple|city|town|village|district|river|painting|mytholog|epic|festival|novel|newspaper|pageant|beauty contest|disambiguation|refer to|president|politician\b(?!.*\bactor))\b/i
const API = 'https://en.wikipedia.org/w/api.php'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchPage(title, attempt = 0) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', prop: 'pageimages|description|extracts',
    piprop: 'thumbnail', pithumbsize: '320', exintro: '1', explaintext: '1',
    redirects: '1', titles: title, origin: '*',
  })
  const res = await fetch(`${API}?${params}`, {
    headers: { 'User-Agent': 'TollyPlay/1.0 (photo overrides; family app)' },
  })
  if (res.status === 429 && attempt < 8) {
    await sleep(8000 * (attempt + 1))
    return fetchPage(title, attempt + 1)
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const q = (await res.json()).query ?? {}
  const page = Object.values(q.pages ?? {})[0]
  return page && page.missing === undefined ? page : null
}

const verify = (page) => {
  const thumb = page?.thumbnail?.source
  if (!thumb) return null
  // Reject on the SHORT description only — the full extract mentions things
  // like "Film Festival" or "temple town" that would false-reject real actors.
  const desc = page.description ?? ''
  if (NOT_PERSON.test(desc)) return null
  if (!PERSON.test(`${desc} ${page.extract ?? ''}`)) return null
  return thumb
}

const result = JSON.parse(fs.readFileSync(OUT, 'utf8'))
let added = 0, failed = []
for (const [name, candidates] of Object.entries(OVERRIDES)) {
  if (name in result) continue
  let done = false
  for (const cand of candidates) {
    try {
      const thumb = verify(await fetchPage(cand))
      if (thumb) { result[name] = thumb; added++; done = true; console.log(`✓ ${name} -> ${cand}`); break }
    } catch (e) { console.log(`  ${name} (${cand}): ${e.message}`) }
    await sleep(5000)
  }
  if (!done) failed.push(name)
}
fs.writeFileSync(OUT, JSON.stringify(result, null, 0))
console.log(`\nadded ${added}, now ${Object.keys(result).length} total. failed: ${failed.join(', ') || 'none'}`)
