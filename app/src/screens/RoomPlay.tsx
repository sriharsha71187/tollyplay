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
  personKey,
  searchMovies,
  type LinkRole,
  type Movie,
} from '../game/movies'
import { supabase } from '../lib/supabase'
import Icon from '../components/Icon'
import Thumb from '../components/Thumb'

const roleLabels: Record<LinkRole, string> = {
  hero: 'Hero',
  heroine: 'Heroine',
  director: 'Director',
}

const me = playerId()

export default function RoomPlay() {
  const { code = '' } = useParams()
  const [params] = useSearchParams()
  const wantsHost = params.get('host') === '1'

  const [movies, setMovies] = useState<Movie[] | null>(null)
  const [state, setState] = useState<RoomState | null>(null)
  const [present, setPresent] = useState<RoomPlayer[]>([])
  const [reject, setReject] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [now, setNow] = useState(Date.now())
  const [copied, setCopied] = useState(false)
  const [storyDraft, setStoryDraft] = useState('')
  /** Set once we've listened long enough to know no host is already running the room. */
  const [claimHost, setClaimHost] = useState(false)

  const chRef = useRef<RealtimeChannel | null>(null)
  const stateRef = useRef<RoomState | null>(null)
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

  // ---- host: broadcast state and (re)arm the phase timer
  function push(s: RoomState) {
    hostState.current = s
    stateRef.current = s
    setState(s)
    chRef.current?.send({ type: 'broadcast', event: 'state', payload: s })
    if (timerRef.current) clearTimeout(timerRef.current)
    if (s.deadline) {
      timerRef.current = setTimeout(
        () => expireRef.current(),
        Math.max(0, s.deadline - Date.now()),
      )
    }
  }

  function expire() {
    const s = hostState.current
    if (!s) return
    if (s.phase === 'turn') strikeOut()
    else if (s.phase === 'story-write' || s.phase === 'story-guess')
      revealStory(s)
    else if (s.phase === 'story-reveal') nextStoryRound(s)
  }
  const expireRef = useRef(expire)
  expireRef.current = expire

  // ---- story mode (host referee)
  function pickSecret(): Movie | null {
    const pool = (movies ?? []).filter((m) => m.linked && m.cast.length >= 2)
    if (!pool.length) return null
    return pool[Math.floor(Math.random() * pool.length)]
  }

  function startStoryRound(s: RoomState, roundNo: number) {
    const writer = s.players[roundNo - 1]
    const secret = pickSecret()
    if (!writer || !secret) {
      push({ ...s, phase: 'over', deadline: null })
      return
    }
    push({
      ...s,
      phase: 'story-write',
      story: {
        writerId: writer.id,
        secretTitle: secret.title,
        secretYear: secret.year,
        secretId: secret.id,
        secretW: secret.w,
        story: null,
        tries: {},
        correct: [],
        roundNo,
      },
      storyAwards: null,
      deadline: Date.now() + 90_000,
    })
  }

  function revealStory(s: RoomState) {
    const st = s.story
    if (!st) return
    const guessers = s.players.filter((p) => p.id !== st.writerId)
    const c = st.correct.length
    const awards: Record<string, number> = {}
    if (st.story) {
      awards[st.writerId] = c > 0 ? (guessers.length - c) * 2 + 2 : 0
      st.correct.forEach((id, i) => {
        awards[id] = i === 0 ? 3 : 2
      })
    }
    const scores = { ...s.scores }
    for (const [id, pts] of Object.entries(awards)) {
      scores[id] = (scores[id] ?? 0) + pts
    }
    push({
      ...s,
      phase: 'story-reveal',
      scores,
      storyAwards: awards,
      deadline: Date.now() + 8_000,
    })
  }

  function nextStoryRound(s: RoomState) {
    const n = s.story?.roundNo ?? 0
    if (n >= s.players.length) {
      push({ ...s, phase: 'over', deadline: null, story: null })
      return
    }
    startStoryRound(s, n + 1)
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
    if (!s) return
    if (a.type === 'story-submit') {
      if (s.phase !== 'story-write' || !s.story || a.playerId !== s.story.writerId)
        return
      if (!a.text.trim()) return
      push({
        ...s,
        phase: 'story-guess',
        story: { ...s.story, story: a.text.trim().slice(0, 300) },
        deadline: Date.now() + 75_000,
      })
      return
    }
    if (a.type === 'story-guess') {
      const st = s.story
      if (s.phase !== 'story-guess' || !st || a.playerId === st.writerId) return
      if (st.correct.includes(a.playerId) || (st.tries[a.playerId] ?? 0) >= 2)
        return
      const right = a.movieId === st.secretId
      const tries = { ...st.tries, [a.playerId]: (st.tries[a.playerId] ?? 0) + 1 }
      const correct = right ? [...st.correct, a.playerId] : st.correct
      const guessers = s.players.filter((p) => p.id !== st.writerId)
      const done = guessers.every(
        (p) => correct.includes(p.id) || (tries[p.id] ?? 0) >= 2,
      )
      if (!right) {
        chRef.current?.send({
          type: 'broadcast',
          event: 'reject',
          payload: {
            playerId: a.playerId,
            reason:
              (tries[a.playerId] ?? 0) >= 2
                ? 'Not it — out of tries!'
                : 'Not it — one try left.',
          },
        })
      }
      const ns = { ...s, story: { ...st, tries, correct } }
      if (done) revealStory(ns)
      else push(ns)
      return
    }
    if (s.phase !== 'turn' || a.playerId !== s.turnPlayerId) return
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
        chain: [...s.chain, { title: movie.title, year: movie.year, via, playerId: a.playerId, points, w: movie.w }],
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
      const p = payload as RoomState
      // Two claimed hosts (e.g. room URL with ?host=1 opened twice):
      // deterministic tie-break — smaller player id keeps the room.
      if (hostState.current && p.hostId !== me) {
        if (p.hostId < me) {
          hostState.current = null
          if (timerRef.current) clearTimeout(timerRef.current)
        } else {
          chRef.current?.send({
            type: 'broadcast',
            event: 'state',
            payload: hostState.current,
          })
          return
        }
      }
      stateRef.current = p
      setState(p)
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
        // Everyone is eligible to claim an ownerless room — the creator just
        // claims faster. Duplicate claims resolve via the id tie-break.
        setTimeout(() => setClaimHost(true), wantsHost ? 1200 : 3000)
      }
    })
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      supabase?.removeChannel(ch)
      chRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  // Host claim: only if nobody broadcast state while we waited.
  useEffect(() => {
    if (!claimHost || stateRef.current || hostState.current || present.length === 0)
      return
    push({
      phase: 'lobby',
      mode: 'chain',
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
      story: null,
      storyAwards: null,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimHost, present])

  // Host-absence watchdog: if the host drops from presence for ~8s, the
  // lowest-id present player adopts the room, rebuilding referee state.
  const adoptTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const s = stateRef.current
    const hostPresent = !s || present.some((p) => p.id === s.hostId)
    if (hostPresent || hostState.current || present.length === 0 || !movies) {
      if (adoptTimer.current) {
        clearTimeout(adoptTimer.current)
        adoptTimer.current = null
      }
      return
    }
    if (adoptTimer.current) return
    adoptTimer.current = setTimeout(() => {
      adoptTimer.current = null
      const cur = stateRef.current
      if (!cur || hostState.current) return
      if (present.some((p) => p.id === cur.hostId)) return
      if (present[0]?.id !== me) return // lowest id adopts
      usedMovies.current.clear()
      personUse.current.clear()
      chainMovies.current = []
      for (const l of cur.chain) {
        const m = movies.find(
          (x) => x.title === l.title && x.year === l.year,
        )
        if (m) {
          chainMovies.current.push(m)
          usedMovies.current.add(m.id)
        }
        if (l.via) {
          const k = personKey(l.via)
          personUse.current.set(k, (personUse.current.get(k) ?? 0) + 1)
        }
      }
      push({
        ...cur,
        hostId: me,
        players:
          cur.phase === 'lobby'
            ? present
            : cur.players,
        deadline: cur.deadline ? Math.max(cur.deadline, Date.now() + 5000) : null,
      })
    }, 8000)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [present, state, movies])

  // host keeps lobby roster synced with presence
  useEffect(() => {
    const s = hostState.current
    if (!s || s.phase !== 'lobby') return
    if (
      s.players.length !== present.length ||
      s.players.some((p, i) => present[i]?.id !== p.id || present[i]?.name !== p.name)
    ) {
      push({ ...s, players: present })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [present])

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
          {wantsHost ? 'Opening the room…' : 'Joining the room…'}
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

        {state.hostId === me ? (
          <>
            <div className="rounded-3xl bg-surface-container p-5">
              <p className="text-xs font-bold tracking-[0.1em] text-on-variant">
                GAME
              </p>
              <div className="mt-3 flex gap-2">
                {(
                  [
                    ['chain', 'link', 'Chain'],
                    ['story', 'auto_stories', 'Story'],
                  ] as const
                ).map(([m, icon, label]) => (
                  <button
                    key={m}
                    onClick={() => push({ ...state, mode: m })}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
                      state.mode === m
                        ? 'bg-gold text-on-gold'
                        : 'bg-surface-high text-on-variant'
                    }`}
                  >
                    <Icon name={icon} className="text-base" />
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-on-variant">
                {state.mode === 'chain'
                  ? 'Take turns linking movies through shared stars & directors.'
                  : 'Each round one player disguises a movie as a story — fewer correct guesses, more points for the writer.'}
              </p>
            </div>
            <div
              className={`rounded-3xl bg-surface-container p-5 ${
                state.mode === 'story' ? 'hidden' : ''
              }`}
            >
              <p className="text-xs font-bold tracking-[0.1em] text-on-variant">
                LIVES
              </p>
              <div className="mt-3 flex gap-2">
                {(
                  [
                    [1, 'Sudden death'],
                    [2, 'One second chance'],
                  ] as const
                ).map(([n, label]) => (
                  <button
                    key={n}
                    onClick={() =>
                      push({
                        ...state,
                        settings: { ...state.settings, strikesToEliminate: n },
                      })
                    }
                    className={`rounded-full px-4 py-2 text-sm font-bold ${
                      state.settings.strikesToEliminate === n
                        ? 'bg-gold text-on-gold'
                        : 'bg-surface-high text-on-variant'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-4 text-xs font-bold tracking-[0.1em] text-on-variant">
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
                const reset = {
                  ...s,
                  scores: {},
                  strikes: {},
                  lifelines: {},
                  chain: [],
                  hint: null,
                  storyAwards: null,
                }
                if (s.mode === 'story') {
                  startStoryRound({ ...reset, story: null }, 1)
                } else {
                  push({
                    ...reset,
                    phase: 'turn',
                    story: null,
                    turnPlayerId: s.players[0].id,
                    deadline: Date.now() + s.settings.turnSeconds * 1000,
                  })
                }
              }}
              className="marquee-glow rounded-full bg-gold py-4 font-display text-lg tracking-wider text-on-gold active:scale-95 disabled:opacity-40"
            >
              {s.players.length < 2
                ? 'WAITING FOR PLAYERS…'
                : s.mode === 'story'
                  ? 'START STORY'
                  : 'START CHAIN'}
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
      (a, b) =>
        (state.scores[b.id] ?? 0) - (state.scores[a.id] ?? 0) ||
        (state.strikes[a.id] ?? 0) - (state.strikes[b.id] ?? 0),
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
        {state.hostId === me && (
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

  // ---------- story mode ----------
  if (
    state.phase === 'story-write' ||
    state.phase === 'story-guess' ||
    state.phase === 'story-reveal'
  ) {
    const s = state
    const st = s.story!
    const writer = s.players.find((p) => p.id === st.writerId)
    const iAmWriter = st.writerId === me
    const secs = s.deadline
      ? Math.max(0, Math.ceil((s.deadline - now) / 1000))
      : 0
    const myTries = st.tries[me] ?? 0
    const iGotIt = st.correct.includes(me)

    return (
      <Screen code={code}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold tracking-[0.15em] text-on-variant">
            STORY · ROUND {st.roundNo}/{s.players.length}
          </p>
          <p
            className={`font-display text-3xl ${
              secs <= 10 && s.phase !== 'story-reveal'
                ? 'animate-pulse text-urgent'
                : 'text-gold'
            }`}
          >
            {String(secs).padStart(2, '0')}s
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {s.players.map((p) => (
            <span
              key={p.id}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs ${
                p.id === st.writerId
                  ? 'marquee-glow bg-gold font-bold text-on-gold'
                  : 'bg-surface-container text-on-variant'
              }`}
            >
              {p.id === st.writerId && <Icon name="edit" className="text-sm" />}
              {st.correct.includes(p.id) && (
                <Icon name="check_circle" fill className="text-sm text-success-bright" />
              )}
              {p.name} · {s.scores[p.id] ?? 0}
            </span>
          ))}
        </div>

        {s.phase === 'story-write' &&
          (iAmWriter ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-3xl border border-gold/40 bg-surface-container p-5 text-center">
                <p className="text-xs font-bold tracking-[0.15em] text-on-variant">
                  YOUR SECRET MOVIE
                </p>
                <p className="mt-2 font-display text-3xl text-gold-bright">
                  {st.secretTitle.toUpperCase()}
                </p>
                <p className="mt-1 text-sm text-on-variant">{st.secretYear}</p>
              </div>
              <textarea
                autoFocus
                value={storyDraft}
                onChange={(e) => setStoryDraft(e.target.value)}
                maxLength={300}
                rows={4}
                placeholder="Disguise it as a story… no names, no songs, be sneaky."
                className="w-full rounded-3xl bg-surface-high px-5 py-4 leading-relaxed placeholder:text-on-variant/50 focus:outline-2 focus:outline-gold"
              />
              <button
                disabled={!storyDraft.trim()}
                onClick={() => {
                  send({ type: 'story-submit', playerId: me, text: storyDraft })
                  setStoryDraft('')
                }}
                className="marquee-glow rounded-full bg-gold py-4 font-display text-lg tracking-wider text-on-gold active:scale-95 disabled:opacity-40"
              >
                SEND IT
              </button>
            </div>
          ) : (
            <div className="m-auto flex flex-col items-center gap-3 text-center">
              <Icon name="edit_note" className="animate-pulse !text-6xl text-gold" />
              <p className="font-display text-2xl">
                {writer?.name.toUpperCase()} IS DISGUISING A MOVIE…
              </p>
              <p className="text-sm text-on-variant">
                Get ready to see through the trick.
              </p>
            </div>
          ))}

        {s.phase === 'story-guess' && (
          <>
            <div className="rounded-3xl border border-gold/30 bg-surface-container p-6 text-center">
              <Icon name="auto_stories" className="text-gold" />
              <p className="mt-3 text-lg italic leading-relaxed">
                “{st.story}”
              </p>
              <p className="mt-3 text-xs text-on-variant">
                — as told by {writer?.name}
              </p>
            </div>
            {iAmWriter ? (
              <p className="text-center text-on-variant">
                {st.correct.length} of {s.players.length - 1} cracked it.
                Fewer is better for you…
              </p>
            ) : iGotIt ? (
              <p className="text-center font-bold text-success-bright">
                ✓ You got it! Waiting for the others…
              </p>
            ) : myTries >= 2 ? (
              <p className="text-center text-on-variant">
                Out of tries — wait for the reveal.
              </p>
            ) : (
              <div>
                {reject && (
                  <div className="mb-2 rounded-2xl bg-urgent-deep/60 px-4 py-3 text-sm text-urgent-soft">
                    ✕ {reject}
                  </div>
                )}
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Which movie is it? (${2 - myTries} ${2 - myTries === 1 ? 'try' : 'tries'} left)`}
                  className="w-full rounded-2xl bg-surface-high px-5 py-3.5 placeholder:text-on-variant/60 focus:outline-2 focus:outline-gold"
                />
                <div className="mt-2 flex flex-col gap-1">
                  {results.map((m) => (
                    <button
                      key={m.id}
                      onClick={() =>
                        send({ type: 'story-guess', playerId: me, movieId: m.id })
                      }
                      className="flex items-baseline justify-between rounded-2xl bg-surface-container px-4 py-3 text-left active:scale-[0.98]"
                    >
                      <span className="font-bold">{m.title}</span>
                      <span className="text-sm text-on-variant">{m.year}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {s.phase === 'story-reveal' && (
          <div className="flex flex-col gap-4">
            <div className="marquee-glow rounded-3xl border border-gold/40 bg-surface-container p-6 text-center">
              <p className="text-xs font-bold tracking-[0.15em] text-on-variant">
                IT WAS
              </p>
              {st.secretW && (
                <Thumb
                  article={st.secretW}
                  label={st.secretTitle}
                  fallback={false}
                  className="mx-auto mt-3 h-40 w-28 rounded-xl border border-gold/30"
                />
              )}
              <p className="mt-2 font-display text-4xl text-gold-bright">
                {st.secretTitle.toUpperCase()}
              </p>
              <p className="mt-1 text-sm text-on-variant">{st.secretYear}</p>
              {!st.story && (
                <p className="mt-3 text-sm text-urgent-soft">
                  {writer?.name} ran out of time — no points this round.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {s.players.map((p) => {
                const pts = s.storyAwards?.[p.id] ?? 0
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-2xl bg-surface-container px-4 py-3"
                  >
                    <span className="font-bold">
                      {p.id === st.writerId ? '✍️ ' : ''}
                      {p.name}
                    </span>
                    <span
                      className={`font-display text-xl ${
                        pts > 0 ? 'text-success-bright' : 'text-on-variant/50'
                      }`}
                    >
                      {pts > 0 ? `+${pts}` : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="text-center text-xs text-on-variant">
              Next round in {secs}s…
            </p>
          </div>
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
      <div className="-mx-5 flex items-center gap-2 overflow-x-auto px-5 pb-2">
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
            <span className="flex items-center gap-2 rounded-2xl bg-surface-container py-1.5 pl-1.5 pr-3 text-sm font-bold">
              {l.w && (
                <Thumb
                  article={l.w}
                  label={l.title}
                  fallback={false}
                  className="h-10 w-7 rounded-md"
                />
              )}
              {l.title}
              <span className="font-normal text-on-variant">{l.year}</span>
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

      {!s.players.some((p) => p.id === me) && (
        <div className="mt-3 rounded-2xl border border-gold/40 bg-surface-container px-4 py-3 text-sm text-on-variant">
          👋 You&apos;re in the room — you&apos;ll be dealt in when the next game
          starts.
        </div>
      )}

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
