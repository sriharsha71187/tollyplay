import { describe, expect, it } from 'vitest'
import { distractors, kathaQuestion, plotPool } from './katha'
import type { Movie } from './movies'

// A tiny archive with one prolific star per era so marqueeStars/isPopular
// have someone to latch onto (>=20 top-billed roles makes a star).
const archive: Movie[] = []
for (let i = 0; i < 25; i++) {
  archive.push({
    id: `old-${i}`,
    title: `Old Film ${i}`,
    year: 1955 + (i % 20),
    director: 'D Old',
    cast: ['Star Classic', `Her ${i}`],
    linked: true,
    w: `Old Film ${i}`,
  })
}
for (let i = 0; i < 25; i++) {
  archive.push({
    id: `new-${i}`,
    title: `New Film ${i}`,
    year: 2013 + (i % 10),
    director: 'D New',
    cast: ['Star Modern', `Her ${i}`],
    linked: true,
    w: `New Film ${i}`,
  })
}
// Deep cuts and star-less films must never reach the pool.
archive.push({
  id: 'obscure',
  title: 'Obscure Film',
  year: 2015,
  director: 'D X',
  cast: ['Nobody Known', 'No One'],
  linked: true,
  w: 'Obscure Film',
})
archive.push({
  id: 'unlinked',
  title: 'Unlinked Film',
  year: 2015,
  director: 'D New',
  cast: ['Star Modern', 'Her 1'],
  linked: false,
  w: null,
})

describe('plotPool', () => {
  it('keeps only famous (star-led, linked) films', () => {
    const pool = plotPool(archive, 'all')
    expect(pool.some((m) => m.id === 'obscure')).toBe(false)
    expect(pool.some((m) => m.id === 'unlinked')).toBe(false)
    expect(pool.length).toBe(50)
  })

  it('applies the era filter', () => {
    const pool = plotPool(archive, 'modern')
    expect(pool.every((m) => m.year >= 2013)).toBe(true)
    expect(pool.length).toBe(25)
  })

  it('falls back to all eras when the era is too thin', () => {
    const thin = archive.filter((m) => m.year >= 2013) // no classics at all
    expect(plotPool(thin, 'classic').length).toBeGreaterThanOrEqual(12)
  })
})

describe('distractors', () => {
  it('returns 3 distinct titles that exclude the answer', () => {
    const pool = plotPool(archive, 'all')
    const d = distractors(pool, 'New Film 3')
    expect(d).toHaveLength(3)
    expect(new Set(d.map((x) => x.title)).size).toBe(3)
    expect(d.some((x) => x.title === 'New Film 3')).toBe(false)
  })
})

describe('kathaQuestion', () => {
  it('era-filters curated kathas and includes the answer among 4 options', () => {
    const used = new Set<string>()
    const q = kathaQuestion(archive, 'modern', used)
    expect(q).not.toBeNull()
    expect(q!.year).toBeGreaterThanOrEqual(2013)
    expect(q!.options).toHaveLength(4)
    expect(q!.options.some((o) => o.title === q!.title)).toBe(true)
    expect(used.size).toBe(1)
  })

  it('never repeats a used katha', () => {
    const used = new Set<string>()
    const seen = new Set<string>()
    for (;;) {
      const q = kathaQuestion(archive, 'modern', used)
      if (!q) break
      expect(seen.has(q.title)).toBe(false)
      seen.add(q.title)
    }
    expect(seen.size).toBeGreaterThan(0)
  })
})
