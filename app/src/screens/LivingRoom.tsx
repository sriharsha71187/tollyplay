import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  buildDeck,
  cardKey,
  cardPool,
  kindMeta,
  type Card,
  type Difficulty,
  type Era,
} from '../game/livingroom'
import { loadMovies, type Movie } from '../game/movies'

interface Team {
  name: string
  score: number
}

type Phase = 'setup' | 'handoff' | 'round' | 'summary' | 'over'

const eras: { key: Era; label: string }[] = [
  { key: 'all', label: 'All eras' },
  { key: '70s', label: '≤70s' },
  { key: '80s', label: '80s' },
  { key: '90s', label: '90s' },
  { key: '2000s', label: '2000s' },
  { key: 'modern', label: 'Now' },
]

export default function LivingRoom() {
  const [movies, setMovies] = useState<Movie[] | null>(null)
  const [phase, setPhase] = useState<Phase>('setup')
  const [teams, setTeams] = useState<Team[]>([
    { name: 'Team A', score: 0 },
    { name: 'Team B', score: 0 },
  ])
  const [era, setEra] = useState<Era>('all')
  const [diff, setDiff] = useState<Difficulty>('classic')
  const [roundSeconds, setRoundSeconds] = useState(60)
  const [roundsPerTeam, setRoundsPerTeam] = useState(3)
  const [teamIdx, setTeamIdx] = useState(0)
  const [roundNo, setRoundNo] = useState(1)
  const [timeLeft, setTimeLeft] = useState(60)
  const [deck, setDeck] = useState<Card[]>([])
  const [cardIdx, setCardIdx] = useState(0)
  const [roundScore, setRoundScore] = useState(0)
  const [passes, setPasses] = useState(0)
  const usedMovies = useRef(new Set<string>())
  const usedCards = useRef(new Set<string>())

  useEffect(() => {
    loadMovies().then(setMovies)
  }, [])

  const pool = useMemo(
    () => (movies ? cardPool(movies, era, diff) : []),
    [movies, era, diff],
  )

  useEffect(() => {
    if (phase !== 'round') return
    if (timeLeft <= 0) {
      endRound()
      return
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft])

  function startRound() {
    const fresh = pool.filter(
      (m) => !usedMovies.current.has(`${m.title}|${m.year}`),
    )
    const cards = buildDeck(fresh, 40, era, diff, Math.random, usedCards.current)
    setDeck(cards)
    setCardIdx(0)
    setRoundScore(0)
    setPasses(0)
    setTimeLeft(roundSeconds)
    setPhase('round')
  }

  function nextCard(scored: boolean) {
    const card = deck[cardIdx]
    if (card) {
      usedCards.current.add(cardKey(card))
      usedMovies.current.add(`${card.title}|${card.year ?? ''}`)
    }
    if (scored) setRoundScore((s) => s + 1)
    else setPasses((p) => p + 1)
    if (cardIdx + 1 >= deck.length) {
      endRound(scored ? 1 : 0)
      return
    }
    setCardIdx((i) => i + 1)
  }

  function endRound(bonus = 0) {
    const gained = roundScore + bonus - Math.floor(passes / 2)
    setTeams((ts) =>
      ts.map((t, i) =>
        i === teamIdx ? { ...t, score: t.score + Math.max(0, gained) } : t,
      ),
    )
    setPhase('summary')
  }

  function nextTurn() {
    const lastTeam = teamIdx === teams.length - 1
    if (lastTeam && roundNo >= roundsPerTeam) {
      setPhase('over')
      return
    }
    if (lastTeam) setRoundNo((r) => r + 1)
    setTeamIdx((i) => (i + 1) % teams.length)
    setPhase('handoff')
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
        <Header teams={teams} />
        <div className="flex flex-col gap-5">
          <section className="rounded-3xl bg-surface-container p-5">
            <SectionLabel>TEAMS</SectionLabel>
            {teams.map((t, i) => (
              <input
                key={i}
                value={t.name}
                onChange={(e) =>
                  setTeams((ts) =>
                    ts.map((q, j) =>
                      j === i ? { ...q, name: e.target.value } : q,
                    ),
                  )
                }
                className="mt-2 w-full rounded-2xl bg-surface-high px-4 py-2.5 focus:outline-2 focus:outline-gold"
              />
            ))}
          </section>

          <section className="rounded-3xl bg-surface-container p-5">
            <SectionLabel>DIFFICULTY</SectionLabel>
            <div className="mt-3 flex gap-2">
              {(
                [
                  ['easy', 'Easy'],
                  ['classic', 'Classic'],
                  ['expert', 'Expert'],
                ] as [Difficulty, string][]
              ).map(([k, label]) => (
                <Pill key={k} active={diff === k} onClick={() => setDiff(k)}>
                  {label}
                </Pill>
              ))}
            </div>
            <p className="mt-2 text-xs text-on-variant">
              {diff === 'easy' && 'Well-known films from 1985 onwards.'}
              {diff === 'classic' && 'All famous films, every era.'}
              {diff === 'expert' && 'Everything — deep cuts included. True fans only.'}
            </p>
            <SectionLabel>
              <span className="mt-4 block">MOVIE ERA</span>
            </SectionLabel>
            <div className="mt-3 flex flex-wrap gap-2">
              {eras.map((e) => (
                <Pill
                  key={e.key}
                  active={era === e.key}
                  onClick={() => setEra(e.key)}
                >
                  {e.label}
                </Pill>
              ))}
            </div>
            <p className="mt-2 text-xs text-on-variant">
              {pool.length} films in this pool
            </p>
          </section>

          <section className="rounded-3xl bg-surface-container p-5">
            <SectionLabel>ROUND TIMER</SectionLabel>
            <div className="mt-3 flex gap-2">
              {[60, 90].map((t) => (
                <Pill
                  key={t}
                  active={roundSeconds === t}
                  onClick={() => setRoundSeconds(t)}
                >
                  {t}s
                </Pill>
              ))}
            </div>
            <SectionLabel>
              <span className="mt-4 block">ROUNDS PER TEAM</span>
            </SectionLabel>
            <div className="mt-3 flex gap-2">
              {[3, 5].map((r) => (
                <Pill
                  key={r}
                  active={roundsPerTeam === r}
                  onClick={() => setRoundsPerTeam(r)}
                >
                  {r}
                </Pill>
              ))}
            </div>
          </section>

          <button
            onClick={() => setPhase('handoff')}
            className="marquee-glow rounded-full bg-gold py-4 font-display text-lg tracking-wider text-on-gold active:scale-95"
          >
            START GAME
          </button>
          <p className="text-center text-xs text-on-variant">
            One clue-giver per round holds the phone. Team shouts the movie.
          </p>
        </div>
      </Screen>
    )
  }

  if (phase === 'handoff') {
    return (
      <Screen>
        <Header teams={teams} />
        <div className="m-auto flex flex-col items-center gap-5 text-center">
          <p className="text-on-variant">
            Round {roundNo} of {roundsPerTeam}
          </p>
          <p className="font-display text-5xl text-gold-bright">
            {teams[teamIdx].name.toUpperCase()}
          </p>
          <p className="max-w-60 text-on-variant">
            Pick a clue-giver — only they see the phone.
          </p>
          <button
            onClick={startRound}
            className="marquee-glow rounded-full bg-gold px-10 py-4 font-display text-lg tracking-wider text-on-gold active:scale-95"
          >
            GO
          </button>
        </div>
      </Screen>
    )
  }

  if (phase === 'round') {
    const card = deck[cardIdx]
    const meta = kindMeta[card.kind]
    return (
      <Screen>
        <div className="flex items-center justify-between">
          <p className="font-bold">{teams[teamIdx].name}</p>
          <p
            className={`font-display text-4xl ${
              timeLeft <= 10 ? 'animate-pulse text-urgent' : 'text-gold'
            }`}
          >
            {String(timeLeft).padStart(2, '0')}s
          </p>
          <p className="font-display text-xl text-gold">{roundScore}</p>
        </div>

        <div className="mt-4 flex flex-1 flex-col rounded-3xl bg-surface-container p-6">
          <span className="self-center rounded-full bg-surface-highest px-4 py-1.5 text-sm font-bold tracking-wider">
            {meta.icon} {meta.label}
          </span>
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            {card.kind === 'trivia' || card.kind === 'dialogue' ? (
              <>
                <p
                  className={`text-lg text-on-variant ${
                    card.kind === 'dialogue' ? 'italic' : ''
                  }`}
                >
                  {card.kind === 'dialogue' ? `“${card.clue}”` : card.clue}
                </p>
                <p className="font-display text-2xl text-gold-bright">
                  {card.title.toUpperCase()}
                </p>
              </>
            ) : (
              <>
                <p className="font-display text-3xl leading-snug">
                  {card.title.toUpperCase()}
                </p>
                <p className="text-sm text-on-variant">{card.year}</p>
              </>
            )}
            {card.kind === 'describe' && card.banned.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-bold tracking-[0.1em] text-urgent-soft">
                  BANNED
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {card.banned.map((w) => (
                    <span
                      key={w}
                      className="rounded-full bg-urgent-deep/50 px-3 py-1 text-sm text-urgent-soft"
                    >
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-on-variant">{meta.help}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => nextCard(false)}
            className="rounded-full bg-surface-high py-4 font-display tracking-wider text-on-variant active:scale-95"
          >
            PASS
          </button>
          <button
            onClick={() => nextCard(true)}
            className="rounded-full bg-success py-4 font-display tracking-wider text-surface active:scale-95"
          >
            GOT IT!
          </button>
        </div>
      </Screen>
    )
  }

  if (phase === 'summary') {
    return (
      <Screen>
        <Header teams={teams} />
        <div className="m-auto flex flex-col items-center gap-4 text-center">
          <p className="font-display text-4xl text-gold-bright">TIME!</p>
          <p className="text-on-variant">
            {teams[teamIdx].name}: {roundScore} correct, {passes} passed
            {passes > 1 && ` (−${Math.floor(passes / 2)})`}
          </p>
          <button
            onClick={nextTurn}
            className="marquee-glow rounded-full bg-gold px-10 py-4 font-display text-lg tracking-wider text-on-gold active:scale-95"
          >
            NEXT
          </button>
        </div>
      </Screen>
    )
  }

  const ranked = [...teams].sort((a, b) => b.score - a.score)
  const tie = ranked[0].score === ranked[1]?.score
  return (
    <Screen>
      <Header />
      <div className="flex flex-col gap-4">
        <p className="text-center font-display text-4xl text-gold-bright">
          {tie ? "IT'S A TIE!" : `${ranked[0].name.toUpperCase()} WINS!`}
        </p>
        {ranked.map((t, i) => (
          <div
            key={t.name}
            className={`flex items-center justify-between rounded-3xl p-5 ${
              i === 0 && !tie
                ? 'marquee-glow bg-surface-high'
                : 'bg-surface-container'
            }`}
          >
            <p className="font-bold">
              {i === 0 && !tie ? '👑 ' : ''}
              {t.name}
            </p>
            <p className="font-display text-2xl text-gold">{t.score}</p>
          </div>
        ))}
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

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-bold ${
        active ? 'bg-gold text-on-gold' : 'bg-surface-high text-on-variant'
      }`}
    >
      {children}
    </button>
  )
}

function Header({ teams }: { teams?: Team[] }) {
  return (
    <header className="mb-4 flex items-center justify-between">
      <Link to="/" className="text-on-variant">
        ← Exit
      </Link>
      <span className="font-display text-xl text-gold-bright">LIVING ROOM</span>
      <span className="text-sm text-on-variant">
        {teams ? teams.map((t) => t.score).join(' · ') : ''}
      </span>
    </header>
  )
}
