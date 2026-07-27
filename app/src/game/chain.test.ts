import { describe, expect, it } from 'vitest'
import { defaultSettings, judgeMove } from './chain'
import { linkPeople, personKey, type Movie } from './movies'

const movie = (
  id: string,
  cast: string[],
  director = 'Some Director',
  linked = true,
): Movie => ({ id, title: id, year: 2000, director, cast, linked, w: id })

const s = { ...defaultSettings }

describe('judgeMove', () => {
  it('links movies sharing a hero', () => {
    const a = movie('a', ['Chiranjeevi', 'Vijaya Shanthi'], 'D1')
    const b = movie('b', ['Chiranjeevi', 'Radha'], 'D2')
    const v = judgeMove(a, b, new Set(), s)
    expect(v.ok).toBe(true)
    expect(v.via).toBe('Chiranjeevi')
  })

  it('rejects a movie already in the chain', () => {
    const a = movie('a', ['Chiranjeevi', 'Radha'])
    const v = judgeMove(a, a, new Set(['a']), s)
    expect(v.ok).toBe(false)
  })

  it('rejects when nothing is shared', () => {
    const a = movie('a', ['Chiranjeevi', 'Radha'], 'D1')
    const b = movie('b', ['Nagarjuna', 'Amala'], 'D2')
    expect(judgeMove(a, b, new Set(), s).ok).toBe(false)
  })

  it('has NO per-person link limit — one star can carry the whole chain', () => {
    const films = Array.from({ length: 6 }, (_, i) =>
      movie(`m${i}`, ['Chiranjeevi', `Heroine ${i}`], `D${i}`),
    )
    const used = new Set<string>([films[0].id])
    for (let i = 1; i < films.length; i++) {
      const v = judgeMove(films[i - 1], films[i], used, s)
      expect(v.ok).toBe(true)
      expect(v.via).toBe('Chiranjeevi')
      used.add(films[i].id)
    }
  })

  it('treats spacing/punctuation variants as the same person', () => {
    const a = movie('a', ['N. T. Rama Rao', 'Savitri'], 'D1')
    const b = movie('b', ['N.T. Rama Rao', 'Jamuna'], 'D2')
    expect(judgeMove(a, b, new Set(), s).ok).toBe(true)
  })

})

describe('multi-star leads (two A-level stars in one film)', () => {
  // Venkatesh + Mahesh Babu (both male marquee stars) sharing top billing,
  // as in Seethamma Vakitlo Sirimalle Chettu.
  const stars = new Set([
    personKey('Venkatesh'),
    personKey('Mahesh Babu'),
    personKey('Rajinikanth'),
  ])
  const svsc = movie('svsc', ['Venkatesh', 'Mahesh Babu', 'Samantha'], 'Srikanth Addala')

  it('exposes BOTH stars as heroes', () => {
    const people = linkPeople(svsc, ['hero'], stars)
    expect(people.has(personKey('Venkatesh'))).toBe(true)
    expect(people.has(personKey('Mahesh Babu'))).toBe(true)
  })

  it('shifts the heroine to the next cast member', () => {
    const people = linkPeople(svsc, ['heroine'], stars)
    expect(people.has(personKey('Samantha'))).toBe(true)
    expect(people.has(personKey('Mahesh Babu'))).toBe(false)
  })

  it('chains through the second-billed star', () => {
    const pokiri = movie('pokiri', ['Mahesh Babu', 'Ileana'], 'Puri Jagannadh')
    const v = judgeMove(svsc, pokiri, new Set(), { ...s, roles: ['hero'] }, stars)
    expect(v.ok).toBe(true)
    expect(v.via).toBe('Mahesh Babu')
  })

  it('does NOT treat a star hero–heroine pair as a duo', () => {
    // Rajinikanth + Ramya Krishnan (opposite genders) — normal hero/heroine.
    const m = movie('narasimha', ['Rajinikanth', 'Ramya Krishnan', 'Soundarya'], 'K. S. Ravikumar')
    const withStars = new Set([...stars, personKey('Ramya Krishnan')])
    const heroes = linkPeople(m, ['hero'], withStars)
    expect(heroes.has(personKey('Rajinikanth'))).toBe(true)
    expect(heroes.has(personKey('Ramya Krishnan'))).toBe(false)
    const heroines = linkPeople(m, ['heroine'], withStars)
    expect(heroines.has(personKey('Ramya Krishnan'))).toBe(true)
  })

  it('keeps the old behavior when no star set is passed', () => {
    const people = linkPeople(svsc, ['hero', 'heroine'])
    expect(people.has(personKey('Venkatesh'))).toBe(true)
    expect(people.has(personKey('Mahesh Babu'))).toBe(true)
    expect(people.has(personKey('Samantha'))).toBe(false)
  })
})
