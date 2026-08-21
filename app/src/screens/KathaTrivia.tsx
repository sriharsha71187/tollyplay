import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  bankKRun,
  loadKStats,
  nextPlotQuestion,
  type PlotQuestion,
} from '../game/katha'
import { loadMovies, type Movie } from '../game/movies'
import type { StoryEra } from '../game/room'
import Thumb from '../components/Thumb'

const LIVES = 3
const POINTS = 10

const eras: { key: StoryEra; label: string }[] = [
  { key: 'all', label: 'Any year' },
  { key: 'classic', label: '≤ 70s' },
  { key: '80s', label: '80s' },
  { key: '90s', label: '90s' },
  { key: '2000s', label: '2000s' },
  { key: 'modern', label: 'Now' },
]

type Phase = 'setup' | 'run' | 'over'

export default function KathaTrivia() {
  const [movies, setMovies] = useState<Movie[] | null>(null)
  const [phase, setPhase] = useState<Phase>('setup')
  const [era, setEra] = useState<StoryEra>('all')
  const [q, setQ] = useState<PlotQuestion | null>(null)
  const [loadingQ, setLoadingQ] = useState(false)
  const [qIndex, setQIndex] = useState(0)
  const [lives, setLives] = useState(LIVES)
  const [score, setScore] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [stats, setStats] = useState(loadKStats())
  const usedIds = useRef(new Set<string>())
  const usedTags = useRef(new Set<string>())
  // The next question loads WHILE the current one is on screen.
  const prefetch = useRef<Promise<PlotQuestion | null> | null>(null)

  useEffect(() => {
    loadMovies().then(setMovies)
  }, [])

  function armPrefetch(nextIndex: number) {
    prefetch.current = nextPlotQuestion(
      movies!,
      era,
      nextIndex,
      usedIds.current,
      usedTags.current,
    )
  }

  async function serve(index: number, from?: Promise<PlotQuestion | null>) {
    setLoadingQ(true)
    const next = await (from ??
      nextPlotQuestion(movies!, era, index, usedIds.current, usedTags.current))
    setLoadingQ(false)
    if (!next) {
      // Era exhausted (or fully offline with curated spent) — end the run.
      endRun()
      return
    }
    setQ(next)
    setPicked(null)
    armPrefetch(index + 1)
  }

  function startRun() {
    usedIds.current.clear()
    usedTags.current.clear()
    prefetch.current = null
    setScore(0)
    setLives(LIVES)
    setQIndex(0)
    setQ(null)
    setPhase('run')
    serve(0)
  }

  function endRun() {
    setStats(bankKRun(score))
    setPhase('over')
  }

  function answer(title: string) {
    if (!q || picked) return
    setPicked(title)
    const right = title === q.title
    const nextLives = right ? lives : lives - 1
    const nextScore = right ? score + POINTS : score
    if (right) setScore(nextScore)
    else setLives(nextLives)
    setTimeout(() => {
      if (nextLives <= 0) {
        setStats(bankKRun(nextScore))
        setPhase('over')
        return
      }
      const n = qIndex + 1
      setQIndex(n)
      serve(n, prefetch.current ?? undefined)
    }, 1600)
  }

  if (!movies) {
    return (
      <Screen>
        <p className="m-auto text-on-variant">Loading the film archive…</p>
      </Screen>
    )
  }

  if (phase === 'setup' || phase === 'over') {
    return (
      <Screen>
        <Header />
        <div className="flex flex-col gap-5">
          {phase === 'over' && (
            <div className="marquee-glow rounded-3xl border border-gold/40 bg-surface-container p-6 text-center">
              <p className="text-xs font-bold tracking-[0.15em] text-on-variant">
                RUN OVER
              </p>
              <p className="mt-2 font-display text-6xl text-gold-bright">
                {score}
              </p>
              <p className="mt-2 text-sm text-on-variant">
                {qIndex + 1} stories
                {score >= stats.bestRun && score > 0 && ' · 🏆 new best!'}
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ['Total points', stats.totalPoints],
                ['Best run', stats.bestRun],
                ['Runs', stats.runs],
              ] as const
            ).map(([label, v]) => (
              <div
                key={label}
                className="rounded-2xl bg-surface-container p-4 text-center"
              >
                <p className="text-[11px] font-bold tracking-[0.12em] text-on-variant">
                  {label.toUpperCase()}
                </p>
                <p className="mt-1 font-display text-2xl text-gold">{v}</p>
              </div>
            ))}
          </div>

          <section className="rounded-3xl bg-surface-container p-5">
            <p className="text-xs font-bold tracking-[0.1em] text-on-variant">
              FROM THE ERA
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {eras.map((e) => (
                <button
                  key={e.key}
                  onClick={() => setEra(e.key)}
                  className={`rounded-full px-4 py-2 text-sm font-bold ${
                    era === e.key
                      ? 'bg-gold text-on-gold'
                      : 'bg-surface-high text-on-variant'
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </section>

          <button
            onClick={startRun}
            className="marquee-glow-strong rounded-full bg-gold py-4 font-display text-xl tracking-wider text-on-gold active:scale-95"
          >
            {phase === 'over' ? 'RUN IT BACK' : 'START A RUN'}
          </button>

          <div className="rounded-3xl bg-surface-container p-5 text-sm text-on-variant">
            <p className="font-bold text-on-surface">How it works</p>
            <p className="mt-2">
              Real stories from famous films — names hidden as X, Y, Z. Pick
              the movie from four choices. {LIVES} lives, +{POINTS} a story,
              no cap. Only films everyone has heard of.
            </p>
          </div>
        </div>
      </Screen>
    )
  }

  // phase === 'run'
  return (
    <Screen>
      <Header />
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-bold tracking-widest text-on-variant">
          STORY {qIndex + 1}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-lg tracking-widest">
            {'❤️'.repeat(lives)}
            {'🖤'.repeat(LIVES - lives)}
          </span>
          <span className="font-display text-3xl text-gold">{score}</span>
        </div>
      </div>

      {loadingQ || !q ? (
        <div className="m-auto flex flex-col items-center gap-3 text-on-variant">
          <span className="animate-pulse text-4xl">🎞️</span>
          <p>Rolling the reels…</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="rounded-3xl border border-gold/30 bg-surface-container p-6 text-center">
            <p className="text-2xl">📖</p>
            <p className="mt-3 text-lg italic leading-relaxed">“{q.story}”</p>
            <p className="mt-3 text-xs text-on-variant">
              {q.kind === 'real'
                ? '— the real story, straight from the reels'
                : '— a katha from the vault'}
            </p>
          </div>

          {picked && q.w && (
            <Thumb
              article={q.w}
              label={q.title}
              fallback={false}
              className="mx-auto h-32 w-24 rounded-xl border border-gold/30"
            />
          )}

          <div className="flex flex-col gap-2">
            {q.options.map((o) => {
              let cls = 'bg-surface-container active:scale-[0.98]'
              if (picked) {
                cls =
                  o.title === q.title
                    ? 'bg-success font-bold text-surface'
                    : o.title === picked
                      ? 'bg-urgent-deep text-urgent-soft'
                      : 'bg-surface-container opacity-50'
              }
              return (
                <button
                  key={`${o.title}|${o.year}`}
                  onClick={() => answer(o.title)}
                  className={`flex items-baseline justify-between rounded-2xl px-5 py-3.5 text-left ${cls}`}
                >
                  <span className="font-bold">{o.title}</span>
                  <span className="text-sm opacity-70">{o.year}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
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

function Header() {
  return (
    <header className="mb-4 flex items-center justify-between">
      <Link to="/" className="text-on-variant">
        ← Exit
      </Link>
      <span className="font-display text-xl text-gold-bright">
        KATHA TRIVIA
      </span>
      <span className="text-xs font-bold tracking-[0.15em] text-on-variant">
        REAL PLOTS
      </span>
    </header>
  )
}
