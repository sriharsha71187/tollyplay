import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { makeRoomCode, savedName, saveName } from '../game/room'
import { supabase } from '../lib/supabase'

export default function Rooms() {
  const nav = useNavigate()
  const [name, setName] = useState(savedName())
  const [code, setCode] = useState('')

  function go(roomCode: string, host: boolean) {
    if (!name.trim()) return
    saveName(name.trim())
    nav(`/room/${roomCode.toUpperCase()}${host ? '?host=1' : ''}`)
  }

  if (!supabase) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-3xl">PARTY ROOMS</h1>
        <p className="rounded-3xl bg-surface-container p-6 text-center text-on-variant">
          Rooms are almost ready — waiting on server keys.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="hero-backdrop relative overflow-hidden rounded-3xl p-6 md:p-8">
        <h1 className="font-display text-4xl text-gold-bright">PARTY ROOMS</h1>
        <p className="mt-2 max-w-sm text-sm text-on-variant">
          One room code, everyone plays live — Chain or Story, host&apos;s
          pick.
        </p>
      </div>

      <div className="rounded-3xl bg-surface-container p-5">
        <p className="text-xs font-bold tracking-[0.1em] text-on-variant">
          YOUR NAME
        </p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Who's playing?"
          className="mt-3 w-full rounded-2xl bg-surface-high px-5 py-3.5 placeholder:text-on-variant/50 focus:outline-2 focus:outline-gold"
        />
      </div>

      <button
        onClick={() => go(makeRoomCode(), true)}
        disabled={!name.trim()}
        className="marquee-glow rounded-full bg-gold py-4 font-display text-lg tracking-wider text-on-gold active:scale-95 disabled:opacity-40"
      >
        CREATE ROOM
      </button>

      <div className="rounded-3xl bg-surface-container p-6">
        <p className="text-xs font-bold tracking-[0.1em] text-on-variant">
          JOIN WITH CODE
        </p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABCDE"
          maxLength={5}
          className="mt-3 w-full rounded-2xl bg-surface-high px-5 py-3.5 text-center font-display text-2xl tracking-[0.3em] placeholder:text-on-variant/40 focus:outline-2 focus:outline-gold"
        />
        <button
          onClick={() => go(code, false)}
          disabled={!name.trim() || code.length !== 5}
          className="mt-4 w-full rounded-full bg-surface-high py-3.5 font-display tracking-wider text-on-surface active:scale-95 disabled:opacity-40"
        >
          JOIN
        </button>
      </div>
    </div>
  )
}
