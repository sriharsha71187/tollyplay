import { describe, expect, it } from 'vitest'
import { nextAlivePlayer } from './room'

const players = (...ids: string[]) => ids.map((id) => ({ id, name: id }))

describe('nextAlivePlayer', () => {
  const four = players('A', 'B', 'C', 'D')

  it('advances in seating order', () => {
    expect(nextAlivePlayer(four, {}, 1, 'A')).toBe('B')
    expect(nextAlivePlayer(four, {}, 1, 'B')).toBe('C')
  })

  it('wraps around from the last seat', () => {
    expect(nextAlivePlayer(four, {}, 1, 'D')).toBe('A')
  })

  it('does NOT skip players when the mover was just eliminated', () => {
    // C fails and is eliminated on their own turn — next must be D, not A.
    // (The old alive-list scan lost C's seat and restarted at A.)
    expect(nextAlivePlayer(four, { C: 1 }, 1, 'C')).toBe('D')
    expect(nextAlivePlayer(four, { B: 1 }, 1, 'B')).toBe('C')
  })

  it('skips eliminated players mid-rotation', () => {
    expect(nextAlivePlayer(four, { B: 1 }, 1, 'A')).toBe('C')
    expect(nextAlivePlayer(four, { B: 1, C: 1 }, 1, 'A')).toBe('D')
  })

  it('wraps across eliminated players at the end of the order', () => {
    expect(nextAlivePlayer(four, { D: 1, A: 1 }, 1, 'C')).toBe('B')
  })

  it('respects multi-strike elimination thresholds', () => {
    // 2 strikes to eliminate: one strike keeps you in the rotation.
    expect(nextAlivePlayer(four, { B: 1 }, 2, 'A')).toBe('B')
    expect(nextAlivePlayer(four, { B: 2 }, 2, 'A')).toBe('C')
  })

  it('handles an unknown or null mover (game opener)', () => {
    expect(nextAlivePlayer(four, {}, 1, null)).toBe('A')
    expect(nextAlivePlayer(four, { A: 1 }, 1, null)).toBe('B')
  })
})
