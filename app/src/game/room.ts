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

export type RoomAction =
  | { type: 'play'; playerId: string; movieId: string }
  | { type: 'lifeline'; playerId: string }
  | { type: 'story-submit'; playerId: string; text: string }
  | { type: 'story-guess'; playerId: string; movieId: string }

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
