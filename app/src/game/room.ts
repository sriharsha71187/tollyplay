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
}

export interface RoomState {
  phase: 'lobby' | 'turn' | 'over'
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
}

export type RoomAction =
  | { type: 'play'; playerId: string; movieId: string }
  | { type: 'lifeline'; playerId: string }

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
