import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  defaultSettings,
  judgeMove,
  recordMove,
  type ChainLink,
  type ChainSettings,
  type Verdict,
} from '../game/chain'
import { loadMovies, searchMovies, type LinkRole, type Movie } from '../game/movies'

interface Player {
  name: string
  score: number
  strikes: number
}

type Phase = 'setup' | 'handoff' | 'turn' | 'over'

const roleLabels: Record<LinkRole, string> = {
  hero: 'Hero',
  heroine: 'Heroine',
  director: 'Director',
}

export default function ChainGame() {
  const [movies, setMovies] = useState<Movie[] | null>(null)
  const [phase, setPhase] = useState<Phase>('setup')
  const [settings, setSettings] = useState<ChainSettings>(defaultSettings)
  const [players, setPlayers] = useState<Player[]>([
    { name: 'Player 1', score: 0, strikes: 0 },
    { name: 'Player 2', score: 0, strikes: 0 },
  ])
  const [turn, setTurn] = useState(0)
  const [chain, setChain] = useState<ChainLink[]>([])
  const [timeLeft, setTimeLeft] = useState(settings.turnSeconds)
  const [query, setQuery] = useState('')
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const usedMovies = useRef(new Set<string>())
  const personUse = useRef(new Map<string, number>())

  useEffect(() => {
    loadMovies().then(setMovies)
  }, [])

  const current = players[turn]
  const lastLink = chain[chain.length - 1]

  const results = useMemo(
    () => (movies && query ? searchMovies(movies, query) : []),
    [movies, query],
  )

  // Turn countdown
  useEffect(() => {
    if (phase !== 'turn') return
    if (timeLeft <= 0) {
      strikeOut()
      return
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft])

  function nextAliveIdx(from: number, ps: Player[]) {
    for (let i = 1; i <= ps.length; i++) {
      const idx = (from + i) % ps.length
      if (ps[idx].strikes < settings.strikesToEliminate) return idx
    }
    return from
  }

  function advance(ps: Player[]) {
    const stillAlive = ps.filter((p) => p.strikes < settings.strikesToEliminate)
    if (stillAlive.length <= 1 && ps.length > 1) {
      setPhase('over')
      return
    }
    setTurn((t) => nextAliveIdx(t, ps))
    setQuery('')
    setVerdict(null)
    setPhase('handoff')
  }

  function strikeOut() {
    const ps = players.map((p, i) =>
      i === turn ? { ...p, strikes: p.strikes + 1 } : p,
    )
    setPlayers(ps)
    advance(ps)
  }

  function play(movie: Movie) {
    if (!lastLink) {
      // opener — anything goes
      usedMovies.current.add(movie.id)
      setChain([{ movie, via: null, playerIdx: turn, points: 0 }])
      advance(players)
      return
    }
    const v = judgeMove(
      lastLink.movie,
      movie,
      usedMovies.current,
      personUse.current,
      settings,
    )
    setVerdict(v)
    if (!v.ok) {
      setQuery('')
      return // keep trying until the clock runs out
    }
    recordMove(v, movie, usedMovies.current, personUse.current)
    setChain((c) => [
      ...c,
      { movie, via: v.via!, playerIdx: turn, points: v.points! },
    ])
    setPlayers((ps) =>
      ps.map((p, i) => (i === turn ? { ...p, score: p.score + v.points! } : p)),
    )
    advance(players)
  }

  function toggleRole(r: LinkRole) {
    setSettings((s) => {
      const on = s.roles.includes(r)
      if (on && s.roles.length === 1) return s // at least one
      return { ...s, roles: on ? s.roles.filter((x) => x !== r) : [...s.roles, r] }
    })
  }

  if (!movies) {
    return (
      <Screen>
        <p className="m-auto text-on-variant">Loading the film archive…</p>
      </Screen>
    )
  }

  if (phase === 'setup') {
    return (
      <Screen>
        <Header />
        <div className="flex flex-col gap-5">
          <section className="rounded-3xl bg-surface-container p-5">
            <SectionLabel>PLAYERS</SectionLabel>
            {players.map((p, i) => (
              <div key={i} className="mt-2 flex items-center gap-2">
                <input
                  value={p.name}
                  onChange={(e) =>
                    setPlayers((ps) =>
                      ps.map((q, j) =>
                        j === i ? { ...q, name: e.target.value } : q,
                      ),
                    )
                  }
                  className="w-full rounded-2xl bg-surface-high px-4 py-2.5 focus:outline-2 focus:outline-gold"
                />
                {players.length > 2 && (
                  <button
                    onClick={() =>
                      setPlayers((ps) => ps.filter((_, j) => j !== i))
                    }
                    className="text-on-variant"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {players.length < 8 && (
              <button
                onClick={() =>
                  setPlayers((ps) => [
                    ...ps,
                    { name: `Player ${ps.length + 1}`, score: 0, strikes: 0 },
                  ])
                }
                className="mt-3 text-sm font-bold text-gold"
              >
                + Add player
              </button>
            )}
          </section>

          <section className="rounded-3xl bg-surface-container p-5">
            <SectionLabel>VALID LINKS</SectionLabel>
            <div className="mt-3 flex gap-2">
              {(Object.keys(roleLabels) as LinkRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => toggleRole(r)}
                  className={`rounded-full px-4 py-2 text-sm font-bold ${
                    settings.roles.includes(r)
                      ? 'bg-gold text-on-gold'
                      : 'bg-surface-high text-on-variant'
                  }`}
                >
                  {roleLabels[r]}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-3xl bg-surface-container p-5">
            <SectionLabel>TURN TIMER</SectionLabel>
            <div className="mt-3 flex gap-2">
              {[15, 30, 45].map((t) => (
                <button
                  key={t}
                  onClick={() => setSettings((s) => ({ ...s, turnSeconds: t }))}
                  className={`rounded-full px-4 py-2 text-sm font-bold ${
                    settings.turnSeconds === t
                      ? 'bg-gold text-on-gold'
                      : 'bg-surface-high text-on-variant'
                  }`}
                >
                  {t}s
                </button>
              ))}
            </div>
          </section>

          <button
            onClick={() => {
              setTimeLeft(settings.turnSeconds)
              setPhase('handoff')
            }}
            className="marquee-glow rounded-full bg-gold py-4 font-display text-lg tracking-wider text-on-gold active:scale-95"
          >
            START GAME
          </button>
        </div>
      </Screen>
    )
  }

  if (phase === 'handoff') {
    return (
      <Screen>
        <Header players={players} />
        <div className="m-auto flex flex-col items-center gap-6 text-center">
          <p className="text-on-variant">Pass the phone to</p>
          <p className="font-display text-5xl text-gold-bright">
            {current.name.toUpperCase()}
          </p>
          {lastLink ? (
            <p className="text-on-variant">
              Chain a movie onto{' '}
              <span className="font-bold text-on-surface">
                {lastLink.movie.title}
              </span>{' '}
              ({lastLink.movie.year})
            </p>
          ) : (
            <p className="text-on-variant">Open the chain with any movie</p>
          )}
          <button
            onClick={() => {
              setTimeLeft(settings.turnSeconds)
              setPhase('turn')
            }}
            className="marquee-glow rounded-full bg-gold px-10 py-4 font-display text-lg tracking-wider text-on-gold active:scale-95"
          >
            I&apos;M READY
          </button>
        </div>
      </Screen>
    )
  }

  if (phase === 'over') {
    const ranked = [...players].sort((a, b) => b.score - a.score)
    return (
      <Screen>
        <Header />
        <div className="flex flex-col gap-4">
          <p className="text-center font-display text-4xl text-gold-bright">
            GAME OVER
          </p>
          {ranked.map((p, i) => (
            <div
              key={p.name}
              className={`flex items-center justify-between rounded-3xl p-5 ${
                i === 0 ? 'marquee-glow bg-surface-high' : 'bg-surface-container'
              }`}
            >
              <p className="font-bold">
                {i === 0 ? '👑 ' : ''}
                {p.name}
              </p>
              <p className="font-display text-2xl text-gold">{p.score}</p>
            </div>
          ))}
          <p className="text-center text-sm text-on-variant">
            Chain length: {chain.length} movies
          </p>
          <Link
            to="/"
            className="rounded-full bg-gold py-4 text-center font-display text-lg tracking-wider text-on-gold"
          >
            DONE
          </Link>
        </div>
      </Screen>
    )
  }

  // phase === 'turn'
  return (
    <Screen>
      <Header players={players} />
      {/* chain strip */}
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2">
        {chain.length === 0 && (
          <p className="text-sm text-on-variant">The chain starts with you.</p>
        )}
        {chain.map((l, i) => (
          <div key={i} className="flex shrink-0 items-center gap-2">
            {l.via && (
              <span className="rounded-full bg-surface-highest px-2.5 py-1 text-xs text-on-variant">
                {l.via}
              </span>
            )}
            <span className="rounded-2xl bg-surface-container px-3 py-2 text-sm font-bold">
              {l.movie.title}
              <span className="ml-1 font-normal text-on-variant">
                {l.movie.year}
              </span>
            </span>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <p className="font-bold">{current.name}</p>
        <p
          className={`font-display text-4xl ${
            timeLeft <= 10 ? 'animate-pulse text-urgent' : 'text-gold'
          }`}
        >
          {String(timeLeft).padStart(2, '0')}s
        </p>
      </div>

      {verdict && !verdict.ok && (
        <div className="mt-2 rounded-2xl bg-urgent-deep/60 px-4 py-3 text-sm text-urgent-soft">
          ✕ {verdict.reason}
        </div>
      )}

      <div className="mt-3">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            lastLink ? `Chain onto ${lastLink.movie.title}…` : 'Name any movie…'
          }
          className="w-full rounded-2xl bg-surface-high px-5 py-3.5 placeholder:text-on-variant/60 focus:outline-2 focus:outline-gold"
        />
        <div className="mt-2 flex flex-col gap-1">
          {results.map((m) => (
            <button
              key={m.id}
              onClick={() => play(m)}
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
      </div>
    </Screen>
  )
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="film-grain mx-auto flex min-h-dvh max-w-md flex-col bg-surface px-5 py-6">
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold tracking-[0.1em] text-on-variant">
      {children}
    </p>
  )
}

function Header({ players }: { players?: Player[] }) {
  return (
    <header className="mb-4 flex items-center justify-between">
      <Link to="/" className="text-on-variant">
        ← Exit
      </Link>
      <span className="font-display text-xl text-gold-bright">CHAIN</span>
      <span className="text-sm text-on-variant">
        {players ? players.map((p) => p.score).join(' · ') : ''}
      </span>
    </header>
  )
}
