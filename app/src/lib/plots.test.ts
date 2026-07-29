import { describe, expect, it } from 'vitest'
import type { Movie } from '../game/movies'
import { redactPlot } from './plots'

const movie: Movie = {
  id: 'okkadu-2003',
  title: 'Okkadu',
  year: 2003,
  director: 'Gunasekhar',
  cast: ['Mahesh Babu', 'Bhumika Chawla'],
  linked: true,
  w: 'Okkadu',
}

describe('redactPlot', () => {
  it('replaces each entity with one consistent letter', () => {
    const text =
      'Ajay, played by Mahesh Babu, is a kabaddi player. Mahesh Babu shelters ' +
      'Swapna (Bhumika Chawla) from a faction lord. Bhumika Chawla flees to Hyderabad.'
    const { out, hits } = redactPlot(text, movie)
    expect(out).not.toContain('Mahesh')
    expect(out).not.toContain('Bhumika')
    expect(hits).toBeGreaterThanOrEqual(4)
    // Same entity → same letter, different entities → different letters.
    const letterFor = (name: string) =>
      redactPlot(`${name} arrives.`, movie).out.trim()[0]
    expect(letterFor('Mahesh Babu')).toBe(letterFor('Mahesh Babu'))
  })

  it('collapses a full name to ONE letter, not one per word', () => {
    const { out } = redactPlot('Mahesh Babu arrives in town.', movie)
    // "X arrives", never "X X arrives".
    expect(out).toMatch(/^[A-Z] arrives in town\.$/)
  })

  it('blanks the title (protagonist-name films) and the source article', () => {
    const dub: Movie = { ...movie, title: 'Narasimha', w: 'Padayappa' }
    const { out, hits } = redactPlot(
      'Padayappa returns to his village after his father dies.',
      dub,
    )
    expect(out).not.toContain('Padayappa')
    expect(hits).toBe(1)
  })

  it('reports zero hits on a generic passage (so callers can skip it)', () => {
    const { hits } = redactPlot(
      'Late at night, a man returns home. He passes by a graveyard and ' +
        'tries to interact with a ghost. The ghost ambushes and kills him.',
      movie,
    )
    expect(hits).toBe(0)
  })

  it('keeps director names out of the story', () => {
    const { out } = redactPlot('A film by Gunasekhar set in Charminar.', movie)
    expect(out).not.toContain('Gunasekhar')
  })
})
