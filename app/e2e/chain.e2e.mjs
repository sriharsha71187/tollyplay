/**
 * E2E: drive the Chain party game with real clicks in headless Chromium.
 *
 * Verifies the two reported field bugs stay fixed:
 *  1. Every suggestion click is accepted (10+ consecutive moves) — no
 *     silently-lost selections.
 *  2. When a player times out and is eliminated, the turn goes to the NEXT
 *     player in seating order (P3 out → P4 up, not back to P1).
 *
 * Run: npm run build && npm run test:e2e
 */
import { spawn } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { chromium } from 'playwright'

const PORT = 4179
const BASE = `http://localhost:${PORT}`

// ---- mirror of the app's linking rules (movies.ts / chain.ts) ------------
const norm = (s) => s.toLowerCase().normalize('NFKC').replace(/\./g, ' ').replace(/\s+/g, ' ').trim()
const personKey = (s) => norm(s).replace(/[^a-z0-9]/g, '')

const movies = JSON.parse(readFileSync(new URL('../public/movies.json', import.meta.url)))
const genders = JSON.parse(readFileSync(new URL('../src/data/genders.json', import.meta.url)))

const credits = new Map()
for (const m of movies)
  for (const p of m.cast.slice(0, 2)) {
    if (!p) continue
    credits.set(personKey(p), (credits.get(personKey(p)) ?? 0) + 1)
  }
const stars = new Set([...credits].filter(([, n]) => n >= 20).map(([k]) => k))

function linkPeople(m) {
  const out = new Map()
  for (const d of m.director.split(',')) {
    const t = d.trim()
    if (t) out.set(personKey(t), t)
  }
  const [a, b] = m.cast
  const starDuo =
    !!a && !!b && stars.has(personKey(a)) && stars.has(personKey(b)) &&
    !!genders[a] && genders[a] === genders[b]
  const heroes = starDuo ? [a, b] : [a]
  const other = starDuo ? m.cast[2] : b
  for (const p of heroes) if (p) out.set(personKey(p), p)
  if (other) out.set(personKey(other), other)
  return out
}

function judge(prev, next, used) {
  if (used.has(next.id)) return null
  const a = linkPeople(prev)
  for (const [key] of linkPeople(next)) {
    if (a.has(key)) return key
  }
  return null
}

/** Greedy: build a chain of `len` movies the app must accept in order. */
function buildChain(len) {
  const titleYear = new Map()
  for (const m of movies) {
    const k = `${norm(m.title)}|${m.year}`
    titleYear.set(k, (titleYear.get(k) ?? 0) + 1)
  }
  const usable = (m) =>
    m.linked && m.title.length >= 4 &&
    titleYear.get(`${norm(m.title)}|${m.year}`) === 1
  const seed = movies.find((m) => m.id === 'athadu-2005') ?? movies.find(usable)
  const chain = [seed]
  const used = new Set([seed.id])
  while (chain.length < len) {
    const prev = chain[chain.length - 1]
    const next = movies.find((m) => usable(m) && !used.has(m.id) && judge(prev, m, used))
    if (!next) throw new Error(`chain stuck after ${chain.length} moves`)
    used.add(next.id)
    chain.push(next)
  }
  return chain
}

// ---- UI driving -----------------------------------------------------------
async function playMovie(page, movie) {
  const input = page.getByPlaceholder(/Chain onto|Name any movie/)
  await input.fill(movie.title)
  const btn = page
    .locator('button', { hasText: movie.title })
    .filter({ hasText: String(movie.year) })
    .first()
  await btn.click()
}

async function ready(page, expectPlayer) {
  const readyBtn = page.getByRole('button', { name: "I'M READY" })
  await readyBtn.waitFor({ timeout: 5000 })
  if (expectPlayer) {
    const seen = await page.getByText(expectPlayer, { exact: true }).count()
    if (!seen) {
      const body = await page.locator('body').innerText()
      throw new Error(`expected handoff for ${expectPlayer}; screen was:\n${body.slice(0, 400)}`)
    }
  }
  await readyBtn.click()
}

async function main() {
  if (!existsSync(new URL('../dist/index.html', import.meta.url)))
    throw new Error('dist/ missing — run `npm run build` first')

  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: new URL('..', import.meta.url).pathname,
    stdio: 'ignore',
  })
  await new Promise((r) => setTimeout(r, 2500))

  const chain = buildChain(11)
  console.log('precomputed chain:', chain.map((m) => `${m.title} (${m.year})`).join(' → '))

  let browser
  try {
    browser = await chromium.launch()
  } catch {
    browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
  }
  const failures = []
  try {
    const page = await browser.newPage()
    await page.goto(`${BASE}/play/chain`)

    // Setup: 4 players, 15s timer.
    await page.getByRole('button', { name: '+ Add player' }).click()
    await page.getByRole('button', { name: '+ Add player' }).click()
    await page.getByRole('button', { name: '15s' }).click()
    await page.getByRole('button', { name: 'START GAME' }).click()

    // P1 opens, P2 chains — every click must be accepted.
    await ready(page, 'PLAYER 1')
    await playMovie(page, chain[0])
    await ready(page, 'PLAYER 2')
    await playMovie(page, chain[1])

    // P3 times out (sudden death) → the turn MUST go to P4, not wrap to P1.
    await ready(page, 'PLAYER 3')
    console.log('letting Player 3 time out (15s)…')
    const readyBtn = page.getByRole('button', { name: "I'M READY" })
    await readyBtn.waitFor({ timeout: 20000 })
    const p4 = await page.getByText('PLAYER 4', { exact: true }).count()
    if (!p4) {
      const body = await page.locator('body').innerText()
      failures.push(`SKIP BUG: after P3 elimination expected PLAYER 4, screen:\n${body.slice(0, 300)}`)
    } else {
      console.log('✓ elimination hands the turn to Player 4 (no skip)')
    }
    await readyBtn.click()

    // Click-reliability: 8 more moves across the 3 remaining players; each
    // suggestion click must register and advance to the next handoff.
    for (let i = 2; i < chain.length - 1; i++) {
      await playMovie(page, chain[i])
      try {
        await ready(page)
        console.log(`✓ move ${i} accepted: ${chain[i].title}`)
      } catch {
        const body = await page.locator('body').innerText()
        failures.push(`CLICK LOST at move ${i} (${chain[i].title}); screen:\n${body.slice(0, 300)}`)
        break
      }
    }

    // Last-one-standing: with 3 players alive, two more timeouts must be
    // needed before GAME OVER — the game may not end while 2 remain.
    console.log('letting the next player time out (3 → 2 alive)…')
    await readyBtn.waitFor({ timeout: 20000 })
    if (await page.getByText('GAME OVER').count()) {
      failures.push('PREMATURE END: game over with 2 players still alive')
    } else {
      console.log('✓ game continues with 2 players alive')
      await readyBtn.click()
      console.log('letting the final opponent time out (2 → 1 alive)…')
      await page.getByText('GAME OVER').waitFor({ timeout: 20000 })
      console.log('✓ game ends exactly when one player remains')
    }
  } finally {
    await browser.close()
    server.kill()
  }

  if (failures.length) {
    console.error('\nE2E FAILURES:\n' + failures.join('\n\n'))
    process.exit(1)
  }
  console.log('\nE2E: all scenarios passed')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
