import type { ChainSettings } from './chain'

export interface RoomPlayer {
  id: string
  name: string
}

export interface NetLink {
  title: string
  year: number
  via: string | null
  playerId: string
  points: number
  /** Wikipedia article for poster lookups (media builds only). */
  w?: string | null
}

export type RoomMode = 'chain' | 'story'

/** Room-level year filter for the movies Story mode deals. */
export type StoryEra = 'all' | 'classic' | '80s' | '90s' | '2000s' | 'modern'

export type StoryRoundKind = 'player' | 'real'

export interface StoryRound {
  /** 'real' rounds have no writer — the app deals an actual plot. */
  kind: StoryRoundKind
  writerId: string
  /** Visible to everyone; the writer's own client hides nothing — family game. */
  secretTitle: string
  secretYear: number
  secretId: string
  secretW?: string | null
  story: string | null
  /** playerId -> tries used */
  tries: Record<string, number>
  /** playerIds in the order they guessed correctly */
  correct: string[]
  roundNo: number
}

export interface RoomState {
  /** Monotonic version, bumped by the host on every push — receivers drop
   *  stale, duplicate, or out-of-order broadcasts. */
  v: number
  phase:
    | 'lobby'
    | 'turn'
    | 'over'
    | 'story-write'
    | 'story-guess'
    | 'story-reveal'
  mode: RoomMode
  hostId: string
  players: RoomPlayer[]
  scores: Record<string, number>
  strikes: Record<string, number>
  /** playerId -> lifeline already used */
  lifelines: Record<string, boolean>
  chain: NetLink[]
  turnPlayerId: string | null
  /** Epoch ms when the current turn expires. */
  deadline: number | null
  settings: ChainSettings
  /** Active lifeline clue for one player. */
  hint: { playerId: string; clue: string } | null
  story: StoryRound | null
  /** Points awarded in the last story round, shown on reveal. */
  storyAwards: Record<string, number> | null
  /** Story mode round source: players write / real plots / mix. */
  storySource: 'players' | 'real' | 'mix'
  /** Story mode: which era the dealt movies come from. */
  storyEra: StoryEra
  /** Chain: host-picked opener; null/absent = random each game. */
  starterId?: string | null
}

/** Inclusive [lo, hi] release-year bounds for a story era ('all' = no filter). */
export function storyEraBounds(era: StoryEra): [number, number] {
  switch (era) {
    case 'classic':
      return [0, 1979]
    case '80s':
      return [1980, 1989]
    case '90s':
      return [1990, 1999]
    case '2000s':
      return [2000, 2012]
    case 'modern':
      return [2013, 9999]
    default:
      return [0, 9999]
  }
}

export type RoomAction = (
  | { type: 'play'; playerId: string; movieId: string }
  | { type: 'lifeline'; playerId: string }
  | { type: 'story-submit'; playerId: string; text: string }
  | { type: 'story-guess'; playerId: string; movieId: string }
) & {
  /** Dedupe token — clients fire each action more than once in case a
   *  broadcast drops; the host referee processes a nonce only once. */
  nonce?: string
}

/** Next player in seating order after `from`, skipping eliminated players.
 *  Scans the full roster (not the alive list) so a just-eliminated mover —
 *  who is absent from the alive list — still anchors the rotation. */
export function nextAlivePlayer(
  players: RoomPlayer[],
  strikes: Record<string, number>,
  strikesToEliminate: number,
  from: string | null,
): string {
  const i = players.findIndex((p) => p.id === from)
  for (let k = 1; k <= players.length; k++) {
    const p = players[(i + k + players.length) % players.length]
    if ((strikes[p.id] ?? 0) < strikesToEliminate) return p.id
  }
  return players[0].id
}

export function playerId(): string {
  let id = localStorage.getItem('tollyplay-pid')
  if (!id) {
    id = Math.random().toString(36).slice(2, 10)
    localStorage.setItem('tollyplay-pid', id)
  }
  return id
}

export function savedName(): string {
  return localStorage.getItem('tollyplay-name') ?? ''
}

export function saveName(name: string) {
  localStorage.setItem('tollyplay-name', name)
}

export function makeRoomCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  return Array.from(
    { length: 5 },
    () => letters[Math.floor(Math.random() * letters.length)],
  ).join('')
}
