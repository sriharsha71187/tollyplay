import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { defaultSettings, judgeMove, recordMove } from '../game/chain'
import {
  playerId,
  savedName,
  type RoomAction,
  type RoomPlayer,
  type RoomState,
} from '../game/room'
import {
  linkPeople,
  loadMovies,
  searchMovies,
  type LinkRole,
  type Movie,
} from '../game/movies'
import { supabase } from '../lib/supabase'

const roleLabels: Record<LinkRole, string> = {
  hero: 'Hero',
  heroine: 'Heroine',
  director: 'Director',
}

const me = playerId()

export default function RoomPlay() {
  const { code = '' } = useParams()
  const [params] = useSearchParams()
  const isHost = params.get('host') === '1'

  const [movies, setMovies] = useState<Movie[] | null>(null)
  const [state, setState] = useState<RoomState | null>(null)
  const [present, setPresent] = useState<RoomPlayer[]>([])
  const [reject, setReject] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [now, setNow] = useState(Date.now())
  const [copied, setCopied] = useState(false)

  const chRef = useRef<RealtimeChannel | null>(null)
  // Host-only referee state
  const hostState = useRef<RoomState | null>(null)
  const usedMovies = useRef(new Set<string>())
  const personUse = useRef(new Map<string, number>())
  const chainMovies = useRef<Movie[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const moviesById = useMemo(
    () => new Map((movies ?? []).map((m) => [m.id, m])),
    [movies],
  )

  useEffect(() => {
    loadMovies().then(setMovies)
  }, [])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [])

  // ---- host: broadcast state and (re)arm the turn timer
  function push(s: RoomState) {
    hostState.current = s
    setState(s)
    chRef.current?.send({ type: 'broadcast', event: 'state', payload: s })
    if (timerRef.current) clearTimeout(timerRef.current)
    if (s.phase === 'turn' && s.deadline) {
      timerRef.current = setTimeout(
        () => strikeOut(),
        Math.max(0, s.deadline - Date.now()),
      )
    }
  }

  function alive(s: RoomState) {
    return s.players.filter(
      (p) => (s.strikes[p.id] ?? 0) < s.settings.strikesToEliminate,
    )
  }

  function nextTurn(s: RoomState, from: string | null): string {
    const a = alive(s)
    const i = a.findIndex((p) => p.id === from)
    return a[(i + 1) % a.length].id
  }

  function strikeOut() {
    const s = hostState.current
    if (!s || s.phase !== 'turn' || !s.turnPlayerId) return
    const strikes = {
      ...s.strikes,
      [s.turnPlayerId]: (s.strikes[s.turnPlayerId] ?? 0) + 1,
    }
    const ns = { ...s, strikes, hint: null }
    advance(ns, s.turnPlayerId)
  }

  function advance(s: RoomState, from: string | null) {
    if (alive(s).length <= 1 && s.players.length > 1) {
      push({ ...s, phase: 'over', turnPlayerId: null, deadline: null })
      return
    }
    push({
      ...s,
      turnPlayerId: nextTurn(s, from),
      deadline: Date.now() + s.settings.turnSeconds * 1000,
    })
  }

  function handleAction(a: RoomAction) {
    const s = hostState.current
    if (!s || s.phase !== 'turn' || a.playerId !== s.turnPlayerId) return
    if (a.type === 'play') {
      const movie = moviesById.get(a.movieId)
      if (!movie) return
      const prev = chainMovies.current[chainMovies.current.length - 1]
      let via: string | null = null
      let points = 1
      if (prev) {
        const v = judgeMove(prev, movie, usedMovies.current, personUse.current, s.settings)
        if (!v.ok) {
          chRef.current?.send({
            type: 'broadcast',
            event: 'reject',
            payload: { playerId: a.playerId, reason: v.reason },
          })
          return
        }
        recordMove(v, movie, usedMovies.current, personUse.current)
        via = v.via!
        points = s.hint?.playerId === a.playerId ? 1 : v.points!
      } else {
        usedMovies.current.add(movie.id)
        points = 0
      }
      chainMovies.current.push(movie)
      const ns: RoomState = {
        ...s,
        chain: [...s.chain, { title: movie.title, year: movie.year, via, playerId: a.playerId, points }],
        scores: { ...s.scores, [a.playerId]: (s.scores[a.playerId] ?? 0) + points },
        hint: null,
      }
      advance(ns, a.playerId)
    }
    if (a.type === 'lifeline') {
      if (s.lifelines[a.playerId] || s.chain.length === 0) return
      const prev = chainMovies.current[chainMovies.current.length - 1]
      const candidates = (movies ?? []).filter((m) => {
        if (usedMovies.current.has(m.id) || !m.linked) return false
        const shared = [...linkPeople(m, s.settings.roles).keys()].find((k) =>
          linkPeople(prev, s.settings.roles).has(k),
        )
        return !!shared && (personUse.current.get(shared) ?? 0) < s.settings.personLimit
      })
      if (!candidates.length) return
      const m = candidates[Math.floor(Math.random() * candidates.length)]
      push({
        ...s,
        lifelines: { ...s.lifelines, [a.playerId]: true },
        hint: {
          playerId: a.playerId,
          clue: `${m.year} · directed by ${m.director}${m.cast[0] ? ` · starring ${m.cast[0]}` : ''}`,
        },
      })
    }
  }
  const handleActionRef = useRef(handleAction)
  handleActionRef.current = handleAction

  // ---- channel wiring
  useEffect(() => {
    if (!supabase) return
    const ch = supabase.channel(`room:${code}`, {
      config: { presence: { key: me }, broadcast: { self: true } },
    })
    chRef.current = ch
    ch.on('presence', { event: 'sync' }, () => {
      const players: RoomPlayer[] = Object.entries(ch.presenceState())
        .map(([id, metas]) => ({
          id,
          name: (metas[0] as { name?: string })?.name ?? 'Player',
        }))
        .sort((a, b) => a.id.localeCompare(b.id))
      setPresent(players)
    })
    ch.on('broadcast', { event: 'state' }, ({ payload }) => {
      setState(payload as RoomState)
    })
    ch.on('broadcast', { event: 'reject' }, ({ payload }) => {
      const p = payload as { playerId: string; reason: string }
      if (p.playerId === me) setReject(p.reason)
    })
    ch.on('broadcast', { event: 'hello' }, () => {
      if (hostState.current) {
        ch.send({ type: 'broadcast', event: 'state', payload: hostState.current })
      }
    })
    ch.on('broadcast', { event: 'action' }, ({ payload }) => {
      handleActionRef.current(payload as RoomAction)
    })
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        ch.track({ name: savedName() || 'Player' })
        ch.send({ type: 'broadcast', event: 'hello', payload: { id: me } })
      }
    })
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      supabase?.removeChannel(ch)
      chRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  // host initializes lobby state once presence is known
  useEffect(() => {
    if (!isHost || hostState.current || present.length === 0) return
    push({
      phase: 'lobby',
      hostId: me,
      players: present,
      scores: {},
      strikes: {},
      lifelines: {},
      chain: [],
      turnPlayerId: null,
      deadline: null,
      settings: defaultSettings,
      hint: null,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, present])

  // host keeps lobby roster synced with presence
  useEffect(() => {
    const s = hostState.current
    if (!isHost || !s || s.phase !== 'lobby') return
    if (
      s.players.length !== present.length ||
      s.players.some((p, i) => present[i]?.id !== p.id || present[i]?.name !== p.name)
    ) {
      push({ ...s, players: present })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [present, isHost])

  function send(action: RoomAction) {
    chRef.current?.send({ type: 'broadcast', event: 'action', payload: action })
    setQuery('')
    setReject(null)
  }

  const results = useMemo(
    () => (movies && query ? searchMovies(movies, query) : []),
    [movies, query],
  )

  if (!supabase) {
    return (
      <Screen code={code}>
        <p className="m-auto text-on-variant">Rooms need server keys first.</p>
      </Screen>
    )
  }
  if (!state || !movies) {
    return (
      <Screen code={code}>
        <p className="m-auto text-on-variant">
          {isHost ? 'Opening the room…' : 'Joining the room…'}
        </p>
      </Screen>
    )
  }

  // ---------- lobby ----------
  if (state.phase === 'lobby') {
    const s = state
    return (
      <Screen code={code}>
        <button
          onClick={async () => {
            const text = `Join my TollyPlay room! Code: ${code}\n${location.origin}/rooms`
            if (navigator.share) await navigator.share({ text }).catch(() => {})
            else {
              await navigator.clipboard.writeText(text)
              setCopied(true)
            }
          }}
          className="rounded-3xl bg-surface-container p-6 text-center"
        >
          <p className="text-xs font-bold tracking-[0.1em] text-on-variant">
            ROOM CODE — TAP TO SHARE
          </p>
          <p className="mt-2 font-display text-5xl tracking-[0.2em] text-gold-bright">
            {code}
          </p>
          {copied && <p className="mt-1 text-xs text-success">Copied!</p>}
        </button>

        <div className="rounded-3xl bg-surface-container p-5">
          <p className="text-xs font-bold tracking-[0.1em] text-on-variant">
            PLAYERS ({s.players.length})
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {s.players.map((p) => (
              <span
                key={p.id}
                className={`rounded-full px-4 py-2 text-sm font-bold ${
                  p.id === s.hostId
                    ? 'bg-gold text-on-gold'
                    : 'bg-surface-high'
                }`}
              >
                {p.id === s.hostId ? '👑 ' : ''}
                {p.name}
                {p.id === me ? ' (you)' : ''}
              </span>
            ))}
          </div>
        </div>

        {isHost ? (
          <>
            <div className="rounded-3xl bg-surface-container p-5">
              <p className="text-xs font-bold tracking-[0.1em] text-on-variant">
                VALID LINKS
              </p>
              <div className="mt-3 flex gap-2">
                {(Object.keys(roleLabels) as LinkRole[]).map((r) => {
                  const on = state.settings.roles.includes(r)
                  return (
                    <button
                      key={r}
                      onClick={() => {
                        if (on && state.settings.roles.length === 1) return
                        push({
                          ...state,
                          settings: {
                            ...state.settings,
                            roles: on
                              ? state.settings.roles.filter((x) => x !== r)
                              : [...state.settings.roles, r],
                          },
                        })
                      }}
                      className={`rounded-full px-4 py-2 text-sm font-bold ${
                        on ? 'bg-gold text-on-gold' : 'bg-surface-high text-on-variant'
                      }`}
                    >
                      {roleLabels[r]}
                    </button>
                  )
                })}
              </div>
            </div>
            <button
              disabled={s.players.length < 2}
              onClick={() => {
                usedMovies.current.clear()
                personUse.current.clear()
                chainMovies.current = []
                const first = s.players[0].id
                push({
                  ...s,
                  phase: 'turn',
                  scores: {},
                  strikes: {},
                  lifelines: {},
                  chain: [],
                  turnPlayerId: first,
                  deadline: Date.now() + s.settings.turnSeconds * 1000,
                  hint: null,
                })
              }}
              className="marquee-glow rounded-full bg-gold py-4 font-display text-lg tracking-wider text-on-gold active:scale-95 disabled:opacity-40"
            >
              {s.players.length < 2 ? 'WAITING FOR PLAYERS…' : 'START CHAIN'}
            </button>
          </>
        ) : (
          <p className="text-center text-sm text-on-variant">
            Waiting for the host to start…
          </p>
        )}
      </Screen>
    )
  }

  // ---------- game over ----------
  if (state.phase === 'over') {
    const ranked = [...state.players].sort(
      (a, b) => (state.scores[b.id] ?? 0) - (state.scores[a.id] ?? 0),
    )
    return (
      <Screen code={code}>
        <p className="text-center font-display text-4xl text-gold-bright">
          GAME OVER
        </p>
        {ranked.map((p, i) => (
          <div
            key={p.id}
            className={`flex items-center justify-between rounded-3xl p-5 ${
              i === 0 ? 'marquee-glow bg-surface-high' : 'bg-surface-container'
            }`}
          >
            <p className="font-bold">
              {i === 0 ? '👑 ' : ''}
              {p.name}
            </p>
            <p className="font-display text-2xl text-gold">
              {state.scores[p.id] ?? 0}
            </p>
          </div>
        ))}
        <p className="text-center text-sm text-on-variant">
          Chain length: {state.chain.length}
        </p>
        {isHost && (
          <button
            onClick={() => push({ ...state, phase: 'lobby' })}
            className="rounded-full bg-gold py-4 font-display text-lg tracking-wider text-on-gold active:scale-95"
          >
            BACK TO LOBBY
          </button>
        )}
      </Screen>
    )
  }

  // ---------- turn ----------
  const s = state
  const current = s.players.find((p) => p.id === s.turnPlayerId)
  const myTurn = s.turnPlayerId === me
  const secsLeft = s.deadline ? Math.max(0, Math.ceil((s.deadline - now) / 1000)) : 0
  const last = s.chain[s.chain.length - 1]
  const myHint = s.hint?.playerId === me ? s.hint : null

  return (
    <Screen code={code}>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2">
        {s.chain.length === 0 && (
          <p className="text-sm text-on-variant">Open the chain with any movie.</p>
        )}
        {s.chain.map((l, i) => (
          <div key={i} className="flex shrink-0 items-center gap-2">
            {l.via && (
              <span className="rounded-full bg-surface-highest px-2.5 py-1 text-xs text-on-variant">
                {l.via}
              </span>
            )}
            <span className="rounded-2xl bg-surface-container px-3 py-2 text-sm font-bold">
              {l.title}
              <span className="ml-1 font-normal text-on-variant">{l.year}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <p className="font-bold">
          {myTurn ? 'Your turn!' : `${current?.name ?? '…'}'s turn`}
        </p>
        <p
          className={`font-display text-4xl ${
            secsLeft <= 10 ? 'animate-pulse text-urgent' : 'text-gold'
          }`}
        >
          {String(secsLeft).padStart(2, '0')}s
        </p>
      </div>

      <div className="mt-1 flex flex-wrap gap-2">
        {s.players.map((p) => (
          <span
            key={p.id}
            className={`rounded-full px-3 py-1 text-xs ${
              p.id === s.turnPlayerId
                ? 'marquee-glow bg-gold font-bold text-on-gold'
                : (s.strikes[p.id] ?? 0) >= s.settings.strikesToEliminate
                  ? 'bg-surface-container text-on-variant/40 line-through'
                  : 'bg-surface-container text-on-variant'
            }`}
          >
            {p.name} · {s.scores[p.id] ?? 0}
          </span>
        ))}
      </div>

      {reject && myTurn && (
        <div className="mt-3 rounded-2xl bg-urgent-deep/60 px-4 py-3 text-sm text-urgent-soft">
          ✕ {reject}
        </div>
      )}
      {myHint && (
        <div className="mt-3 rounded-2xl border border-gold/40 bg-surface-container px-4 py-3 text-sm">
          💡 {myHint.clue}
        </div>
      )}

      {myTurn ? (
        <div className="mt-3">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={last ? `Chain onto ${last.title}…` : 'Name any movie…'}
            className="w-full rounded-2xl bg-surface-high px-5 py-3.5 placeholder:text-on-variant/60 focus:outline-2 focus:outline-gold"
          />
          <div className="mt-2 flex flex-col gap-1">
            {results.map((m) => (
              <button
                key={m.id}
                onClick={() => send({ type: 'play', playerId: me, movieId: m.id })}
                className="flex items-baseline justify-between rounded-2xl bg-surface-container px-4 py-3 text-left active:scale-[0.98]"
              >
                <span className="font-bold">{m.title}</span>
                <span className="text-sm text-on-variant">
                  {m.year}
                  {!m.linked && <span className="ml-2 text-gold">◆ deep cut</span>}
                </span>
              </button>
            ))}
          </div>
          {s.chain.length > 0 && !s.lifelines[me] && !myHint && (
            <button
              onClick={() => send({ type: 'lifeline', playerId: me })}
              className="mt-3 w-full rounded-full bg-surface-high py-3 text-sm font-bold text-on-variant active:scale-95"
            >
              💡 KATHA LIFELINE (once per game)
            </button>
          )}
        </div>
      ) : (
        <p className="mt-6 text-center text-on-variant">
          Waiting for {current?.name}…
        </p>
      )}
    </Screen>
  )
}

function Screen({ code, children }: { code: string; children: React.ReactNode }) {
  return (
    <div className="film-grain mx-auto flex min-h-dvh max-w-md flex-col gap-4 bg-surface px-5 py-6">
      <header className="flex items-center justify-between">
        <Link to="/rooms" className="text-on-variant">
          ← Leave
        </Link>
        <span className="font-display text-xl text-gold-bright">CHAIN</span>
        <span className="text-sm font-bold tracking-widest text-on-variant">
          {code}
        </span>
      </header>
      {children}
    </div>
  )
}
