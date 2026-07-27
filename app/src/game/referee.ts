import { judgeMove, recordMove } from './chain'
import type { Movie } from './movies'
import { nextAlivePlayer, type RoomState } from './room'

/**
 * Chain-mode referee: the pure state transitions the room host applies.
 * Extracted from the RoomPlay component so complete games — eliminations,
 * exhaustion, rotation, the endgame — can be simulated in unit tests.
 */

export interface ChainRefs {
  usedMovies: Set<string>
  personUse: Map<string, number>
  chainMovies: Movie[]
}

export function alivePlayers(s: RoomState) {
  return s.players.filter(
    (p) => (s.strikes[p.id] ?? 0) < s.settings.strikesToEliminate,
  )
}

/** Hand the turn onward — or end the game once a single player remains. */
function advance(s: RoomState, from: string | null): RoomState {
  if (alivePlayers(s).length <= 1 && s.players.length > 1) {
    return { ...s, phase: 'over', turnPlayerId: null, deadline: null }
  }
  return {
    ...s,
    turnPlayerId: nextAlivePlayer(
      s.players,
      s.strikes,
      s.settings.strikesToEliminate,
      from,
    ),
    deadline: Date.now() + s.settings.turnSeconds * 1000,
  }
}

function strike(
  s: RoomState,
  playerId: string,
  reason: string,
): { next: RoomState; out: boolean } {
  const strikes = { ...s.strikes, [playerId]: (s.strikes[playerId] ?? 0) + 1 }
  const out = strikes[playerId] >= s.settings.strikesToEliminate
  const outs = out ? { ...(s.outs ?? {}), [playerId]: reason } : s.outs
  return {
    next: advance({ ...s, strikes, outs, hint: null }, playerId),
    out,
  }
}

/** The current player's clock ran out. */
export function refereeTimeout(s: RoomState): RoomState {
  if (s.phase !== 'turn' || !s.turnPlayerId) return s
  return strike(s, s.turnPlayerId, 'ran out of time').next
}

export interface PlayResult {
  next: RoomState
  /** Set when the lock failed — carries the judge's REAL reason. */
  reject?: { playerId: string; reason: string }
}

/** A player locked in a movie. */
export function refereePlay(
  s: RoomState,
  refs: ChainRefs,
  playerId: string,
  movie: Movie,
  stars?: Set<string>,
): PlayResult {
  if (s.phase !== 'turn' || playerId !== s.turnPlayerId) return { next: s }
  const prev = refs.chainMovies[refs.chainMovies.length - 1]
  let via: string | null = null
  let points = 1
  if (prev) {
    const v = judgeMove(
      prev,
      movie,
      refs.usedMovies,
      refs.personUse,
      s.settings,
      stars,
    )
    if (!v.ok) {
      const reason = v.reason ?? `${movie.title} doesn't link`
      const { next, out } = strike(s, playerId, reason)
      return {
        next,
        reject: {
          playerId,
          reason: out ? `${reason}.` : `${reason} — one life left.`,
        },
      }
    }
    recordMove(v, movie, refs.usedMovies, refs.personUse)
    via = v.via!
    points = s.hint?.playerId === playerId ? 1 : v.points!
  } else {
    refs.usedMovies.add(movie.id)
    points = 0
  }
  refs.chainMovies.push(movie)
  return {
    next: advance(
      {
        ...s,
        chain: [
          ...s.chain,
          { title: movie.title, year: movie.year, via, playerId, points, w: movie.w },
        ],
        scores: { ...s.scores, [playerId]: (s.scores[playerId] ?? 0) + points },
        hint: null,
      },
      playerId,
    ),
  }
}
