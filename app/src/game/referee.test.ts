import { describe, expect, it } from 'vitest'
import { defaultSettings } from './chain'
import type { Movie } from './movies'
import { personKey } from './movies'
import { alivePlayers, refereePlay, refereeTimeout, type ChainRefs } from './referee'
import type { RoomState } from './room'

/** Full room games simulated through the real referee — the parts of the
 *  online game a browser E2E can't reach without a realtime backend. */

const movie = (id: string, cast: string[], director = 'Some Director'): Movie => ({
  id,
  title: id,
  year: 2020,
  director,
  cast,
  linked: true,
  w: id,
})

const freshRefs = (): ChainRefs => ({
  usedMovies: new Set(),
  personUse: new Map(),
  chainMovies: [],
})

const room = (ids: string[], starter = ids[0]): RoomState => ({
  v: 0,
  phase: 'turn',
  mode: 'chain',
  hostId: ids[0],
  players: ids.map((id) => ({ id, name: id })),
  scores: {},
  strikes: {},
  lifelines: {},
  chain: [],
  turnPlayerId: starter,
  deadline: Date.now() + 30_000,
  settings: { ...defaultSettings },
  hint: null,
  story: null,
  storyAwards: null,
  storySource: 'mix',
  storyEra: 'all',
  outs: {},
})

// An Allu Arjun filmography big enough to exhaust him as a link.
const aa = (id: string, heroine: string) => movie(id, ['Allu Arjun', heroine], `Dir ${id}`)
const pushpa = aa('Pushpa', 'Rashmika')
const dj = aa('DJ', 'Pooja')
const race = aa('RaceGurram', 'Shruti')
const ala = aa('AlaVaikunthapurramuloo', 'Pooja H')
const sarrainodu = aa('Sarrainodu', 'Rakul')

describe('referee: the Sarrainodu scenario', () => {
  it('rejects with the REAL reason when the link person is exhausted', () => {
    const refs = freshRefs()
    let s = room(['A', 'B', 'C', 'D'])
    // A opens; B, C, D each chain through Allu Arjun — 3 links, his max.
    s = refereePlay(s, refs, 'A', pushpa).next
    s = refereePlay(s, refs, 'B', dj).next
    s = refereePlay(s, refs, 'C', race).next
    s = refereePlay(s, refs, 'D', ala).next
    expect(s.phase).toBe('turn')
    expect(s.turnPlayerId).toBe('A')
    // A locks Sarrainodu — a legal-looking link, but Allu Arjun is spent.
    const { next, reject } = refereePlay(s, refs, 'A', sarrainodu)
    expect(reject?.reason).toContain('Allu Arjun is exhausted')
    expect(next.outs?.A).toContain('exhausted')
    expect(next.strikes.A).toBe(1)
  })
})

describe('referee: full game to last-one-standing', () => {
  it('plays a complete 4-player game and ends exactly at one survivor', () => {
    const refs = freshRefs()
    let s = room(['A', 'B', 'C', 'D'])

    // A opens (0 points), B chains (1 point).
    s = refereePlay(s, refs, 'A', movie('M1', ['Hero1', 'Her1'], 'D1')).next
    s = refereePlay(s, refs, 'B', movie('M2', ['Hero1', 'Her2'], 'D2')).next
    expect(s.scores.B).toBe(1)
    expect(s.turnPlayerId).toBe('C')

    // C locks a movie that doesn't link → eliminated, turn goes to D (no skip).
    const bad = movie('Bad', ['Nobody', 'NoOne'], 'D9')
    const r1 = refereePlay(s, refs, 'C', bad)
    expect(r1.reject?.reason).toContain('No shared')
    s = r1.next
    expect(s.outs?.C).toContain('No shared')
    expect(s.phase).toBe('turn')
    expect(s.turnPlayerId).toBe('D')
    expect(alivePlayers(s).map((p) => p.id)).toEqual(['A', 'B', 'D'])

    // D times out → eliminated. Two alive: the game must continue with A.
    s = refereeTimeout(s)
    expect(s.outs?.D).toBe('ran out of time')
    expect(s.phase).toBe('turn')
    expect(s.turnPlayerId).toBe('A')

    // A keeps playing — still two alive, still not over.
    s = refereePlay(s, refs, 'A', movie('M3', ['Hero1', 'Her3'], 'D3')).next
    expect(s.phase).toBe('turn')
    expect(s.turnPlayerId).toBe('B')

    // B times out → one alive → game over, with the survivor intact.
    s = refereeTimeout(s)
    expect(s.phase).toBe('over')
    expect(alivePlayers(s).map((p) => p.id)).toEqual(['A'])
    expect(s.outs?.B).toBe('ran out of time')
  })

  it('never ends while two or more players are alive', () => {
    const refs = freshRefs()
    let s = room(['A', 'B', 'C', 'D'])
    s = refereePlay(s, refs, 'A', movie('M1', ['H', 'X'], 'D1')).next
    // Eliminate C and D by timeout on their turns.
    s = refereePlay(s, refs, 'B', movie('M2', ['H', 'Y'], 'D2')).next
    s = refereeTimeout(s) // C out
    s = refereeTimeout(s) // D out
    expect(alivePlayers(s)).toHaveLength(2)
    expect(s.phase).toBe('turn')
    // Rotation now cycles A ↔ B only.
    expect(s.turnPlayerId).toBe('A')
    s = refereePlay(s, refs, 'A', movie('M3', ['H', 'Z'], 'D3')).next
    expect(s.turnPlayerId).toBe('B')
  })

  it('two lives: first wrong lock warns, second eliminates', () => {
    const refs = freshRefs()
    let s = room(['A', 'B'])
    s.settings = { ...s.settings, strikesToEliminate: 2 }
    s = refereePlay(s, refs, 'A', movie('M1', ['H', 'X'], 'D1')).next
    const bad = movie('Bad', ['Q', 'R'], 'D9')
    const r1 = refereePlay(s, refs, 'B', bad)
    expect(r1.reject?.reason).toContain('one life left')
    s = r1.next
    expect(s.phase).toBe('turn')
    expect(alivePlayers(s)).toHaveLength(2)
    // B's second failure (timeout) ends it.
    s = refereePlay(s, refs, 'A', movie('M2', ['H', 'Y'], 'D2')).next
    s = refereeTimeout(s)
    expect(s.phase).toBe('over')
  })

  it('rejects an already-played movie with that reason', () => {
    const refs = freshRefs()
    let s = room(['A', 'B', 'C'])
    const m1 = movie('M1', ['H', 'X'], 'D1')
    s = refereePlay(s, refs, 'A', m1).next
    s = refereePlay(s, refs, 'B', movie('M2', ['H', 'Y'], 'D2')).next
    const { reject } = refereePlay(s, refs, 'C', m1)
    expect(reject?.reason).toContain('already in the chain')
  })

  it('ignores plays from players out of turn', () => {
    const refs = freshRefs()
    const s = room(['A', 'B'])
    const r = refereePlay(s, refs, 'B', movie('M1', ['H', 'X'], 'D1'))
    expect(r.next).toBe(s)
    expect(r.reject).toBeUndefined()
  })

  it('records deep-cut points and via person use', () => {
    const refs = freshRefs()
    let s = room(['A', 'B'])
    s = refereePlay(s, refs, 'A', movie('M1', ['H', 'X'], 'D1')).next
    const deep: Movie = { ...movie('M2', ['H', 'Y'], 'D2'), linked: false }
    s = refereePlay(s, refs, 'B', deep).next
    expect(s.scores.B).toBe(3)
    expect(refs.personUse.get(personKey('H'))).toBe(1)
    expect(s.chain.map((l) => l.title)).toEqual(['M1', 'M2'])
  })
})
