import { useEffect, useState } from 'react'
import Thumb from '../components/Thumb'
import {
  bankRun,
  levelFor,
  LIVES,
  loadStats,
  nextQuestion,
  type NQuestion,
} from '../game/niranjan'
import { loadMovies, type Movie } from '../game/movies'

type Phase = 'idle' | 'run' | 'over'

export default function Niranjan() {
  const [movies, setMovies] = useState<Movie[] | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [stats, setStats] = useState(loadStats())
  const [q, setQ] = useState<NQuestion | null>(null)
  const [qIndex, setQIndex] = useState(0)
  const [lives, setLives] = useState(LIVES)
  const [score, setScore] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [used] = useState(() => new Set<string>())

  useEffect(() => {
    loadMovies().then(setMovies)
  }, [])

  function startRun() {
    used.clear()
    setQIndex(0)
    setLives(LIVES)
    setScore(0)
    setPicked(null)
    setQ(nextQuestion(movies!, 0, used, Math.random))
    setPhase('run')
  }

  function choose(opt: string) {
    if (picked || !q) return
    setPicked(opt)
    const ok = opt === q.answer
    const nScore = ok ? score + q.points : score
    const nLives = ok ? lives : lives - 1
    if (ok) setScore(nScore)
    else setLives(nLives)
    setTimeout(() => {
      if (nLives <= 0) {
        setStats(bankRun(nScore))
        setPhase('over')
        return
      }
      const ni = qIndex + 1
      setQIndex(ni)
      setPicked(null)
      setQ(nextQuestion(movies!, ni, used, Math.random))
    }, 1100)
  }

  const level = levelFor(qIndex)

  if (!movies) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <Head />
        <p className="text-center text-on-variant">Loading the film archive…</p>
      </div>
    )
  }

  if (phase === 'idle' || phase === 'over') {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <Head />
        {phase === 'over' && (
          <div className="marquee-glow rounded-3xl border border-gold/40 bg-surface-container p-6 text-center">
            <p className="text-xs font-bold tracking-[0.15em] text-on-variant">
              RUN OVER
            </p>
            <p className="mt-2 font-display text-6xl text-gold-bright">
              {score}
            </p>
            <p className="mt-2 text-sm text-on-variant">
              {qIndex + 1} questions · reached level {level}
              {score >= stats.bestRun && score > 0 && ' · 🏆 new best!'}
            </p>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          {[
            ['Total points', stats.totalPoints],
            ['Best run', stats.bestRun],
            ['Runs', stats.runs],
          ].map(([k, v]) => (
            <div
              key={String(k)}
              className="rounded-2xl bg-surface-container p-4 text-center"
            >
              <p className="text-[11px] font-bold tracking-[0.12em] text-on-variant">
                {String(k).toUpperCase()}
              </p>
              <p className="mt-1 font-display text-2xl text-gold">{v}</p>
            </div>
          ))}
        </div>
        <button
          onClick={startRun}
          className="marquee-glow-strong rounded-full bg-gold py-4 font-display text-xl tracking-wider text-on-gold active:scale-95"
        >
          {phase === 'over' ? 'RUN IT BACK' : 'START A RUN'}
        </button>
        <div className="rounded-3xl bg-surface-container p-5 text-sm text-on-variant">
          <p className="font-bold text-on-surface">How it works</p>
          <p className="mt-2">
            Endless trivia — {LIVES} lives, no cap. Every 6 questions the level
            rises and the films get deeper. Points scale with level; photo
            rounds pay a bonus. Wrong answers cost a life.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-surface-container px-3 py-1.5 text-xs font-bold tracking-widest text-gold">
            LVL {level}
          </span>
          <span className="text-xs font-bold tracking-widest text-on-variant">
            Q{qIndex + 1}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg tracking-widest">
            {'❤️'.repeat(lives)}
            {'🖤'.repeat(LIVES - lives)}
          </span>
          <span className="font-display text-3xl text-gold">{score}</span>
        </div>
      </div>

      {q ? (
        <>
          <div className="rounded-3xl border border-gold/30 bg-surface-container p-6 text-center">
            <p className="text-xs font-bold tracking-[0.15em] text-on-variant">
              {q.kindLabel} · +{q.points}
            </p>
            {q.photoPeople && (
              <div className="mt-4 flex items-center justify-center gap-4">
                {q.photoPeople.map((p) => (
                  <Thumb
                    key={p}
                    person={p}
                    label={p}
                    className="h-32 w-32 rounded-2xl border border-gold/30"
                  />
                ))}
              </div>
            )}
            <p
              className={`mt-4 text-lg leading-relaxed ${
                q.kindLabel.includes('DIALOGUE') ? 'italic' : ''
              }`}
            >
              {q.prompt}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {q.options.map((opt) => {
              let cls = 'bg-surface-container active:scale-[0.98]'
              if (picked) {
                if (opt === q.answer) cls = 'bg-success font-bold text-surface'
                else if (opt === picked) cls = 'bg-urgent-deep text-urgent-soft'
                else cls = 'bg-surface-container opacity-50'
              }
              return (
                <button
                  key={opt}
                  onClick={() => choose(opt)}
                  className={`rounded-2xl px-5 py-3.5 text-left ${cls}`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </>
      ) : (
        <p className="text-center text-on-variant">
          You emptied the vault — incredible. Start a new run!
        </p>
      )}
    </div>
  )
}

function Head() {
  return (
    <header>
      <h1 className="font-display text-4xl text-gold-bright">EK NIRANJAN</h1>
      <p className="mt-1 text-xs font-bold tracking-[0.15em] text-on-variant">
        ENDLESS TOLLY TRIVIA · HARDER EVERY LEVEL
      </p>
    </header>
  )
}
