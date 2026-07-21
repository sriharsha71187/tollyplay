import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import Thumb from '../components/Thumb'
import { dialogues } from '../content/dialogues'
import { loadStats } from '../game/niranjan'
import { mediaEnabled } from '../lib/media'

/** Iconic classics for the hero rail — [display, wiki article]. */
const featured: [string, string][] = [
  ['Mayabazar', 'Mayabazar'],
  ['Sankarabharanam', 'Sankarabharanam (film)'],
  ['Sagara Sangamam', 'Sagara Sangamam'],
  ['Siva', 'Siva (1989 film)'],
  ['Baahubali', 'Baahubali: The Beginning'],
  ['RRR', 'RRR (film)'],
  ['Pushpa', 'Pushpa: The Rise'],
  ['Pokiri', 'Pokiri'],
  ['Athadu', 'Athadu'],
  ['Magadheera', 'Magadheera'],
  ['Sita Ramam', 'Sita Ramam'],
  ['Jersey', 'Jersey (2019 film)'],
]

function useCountUp(target: number, ms = 700) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (target <= 0) return setV(0)
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms)
      setV(Math.round(target * (1 - (1 - k) ** 3)))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

/** Auto-scrolling rail of real posters (media builds) with CSS fallback. */
function PosterRail() {
  const picks = useMemo(
    () => [...featured].sort(() => Math.random() - 0.5).slice(0, 8),
    [],
  )
  if (!mediaEnabled) return <PosterStack />
  const row = [...picks, ...picks] // doubled for a seamless loop
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 h-48 overflow-hidden opacity-70 md:h-64"
      style={{
        maskImage: 'linear-gradient(to bottom, black 55%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 55%, transparent)',
      }}
    >
      <div className="marquee-track flex w-max gap-4 pt-4" style={{ '--speed': '50s' } as React.CSSProperties}>
        {row.map(([name, article], i) => (
          <div
            key={i}
            className="floaty h-40 w-28 shrink-0 overflow-hidden rounded-xl border border-gold/25 bg-surface-high shadow-2xl md:h-56 md:w-40"
            style={{ '--tilt': `${(i % 3) - 1}deg`, animationDelay: `${(i % 5) * 0.7}s` } as React.CSSProperties}
          >
            <Thumb article={article} label={name} className="h-full w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

const posters: [string, string, string][] = [
  ['MAYABAZAR', '1957', 'from-[#3a2f14] to-[#1c1a29]'],
  ['SANKARA-BHARANAM', '1980', 'from-[#4a1626] to-[#1c1a29]'],
  ['RRR', '2022', 'from-[#14343a] to-[#1c1a29]'],
]

function PosterStack() {
  return (
    <div className="pointer-events-none absolute -right-4 top-6 hidden gap-3 opacity-90 sm:flex md:right-10 md:top-10">
      {posters.map(([title, year, grad], i) => (
        <div
          key={title}
          className={`${i === 1 ? 'poster-tilt-l mt-6' : 'poster-tilt'} floaty h-40 w-28 rounded-xl border border-gold/30 bg-gradient-to-b ${grad} p-2 shadow-2xl md:h-52 md:w-36`}
          style={{ animationDelay: `${i * 0.8}s` }}
        >
          <div className="flex h-full flex-col justify-between rounded-lg border border-gold/20 p-2">
            <span className="font-display text-sm leading-tight text-gold-bright md:text-base">
              {title}
            </span>
            <span className="text-[10px] font-bold tracking-widest text-on-variant">
              {year} · తెలుగు
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

/** Slim scrolling ticker of famous dialogues. */
function DialogueTicker() {
  const row = useMemo(() => {
    const d = [...dialogues].sort(() => Math.random() - 0.5).slice(0, 8)
    return [...d, ...d]
  }, [])
  return (
    <div className="relative overflow-hidden rounded-full border border-surface-highest bg-surface-lowest/70 py-2.5">
      <div className="marquee-track flex w-max items-center gap-8 px-4" style={{ '--speed': '60s' } as React.CSSProperties}>
        {row.map((d, i) => (
          <span key={i} className="flex shrink-0 items-center gap-8 text-sm text-on-variant">
            <span className="italic">“{d.text}”</span>
            <span className="text-gold">✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export default function Home() {
  const nstats = loadStats()
  const pts = useCountUp(nstats.totalPoints)

  const hero = (
    <section className="hero-backdrop group relative overflow-hidden rounded-3xl">
      <PosterRail />
      <div className="relative z-10 flex flex-col gap-4 p-6 pt-40 md:p-10 md:pt-56">
        <div className="rise flex w-max items-center gap-2 rounded-full border border-gold/50 bg-gold/15 px-4 py-1.5 backdrop-blur-md">
          <Icon name="local_fire_department" fill className="text-sm text-gold" />
          <span className="text-xs font-bold tracking-[0.15em] text-gold-bright">
            ENDLESS TRIVIA
          </span>
        </div>
        <h2
          className="title-sheen rise font-display text-5xl leading-none md:text-7xl"
          style={{ animationDelay: '0.08s' }}
        >
          EK NIRANJAN
        </h2>
        <p
          className="rise max-w-md text-on-variant md:text-lg"
          style={{ animationDelay: '0.16s' }}
        >
          Three lives, no limit. Questions climb from blockbuster to deep cut —
          how far can you run?
        </p>
        <div
          className="rise mt-2 flex flex-wrap items-center gap-4"
          style={{ animationDelay: '0.24s' }}
        >
          <Link
            to="/daily"
            className="glow-pulse flex items-center gap-2 rounded-full bg-gold px-8 py-3.5 font-display text-lg tracking-wider text-on-gold transition-transform hover:scale-[1.03] active:scale-95"
          >
            <Icon name="play_arrow" fill />
            START A RUN
          </Link>
          <div className="flex items-center gap-2 rounded-full border border-surface-highest bg-surface-container/60 px-4 py-2 text-sm text-on-variant backdrop-blur-sm">
            <Icon name="trophy" className="text-sm" />
            Best run {nstats.bestRun} · {pts} pts banked
          </div>
        </div>
      </div>
    </section>
  )

  const modes = (
    <section className="grid gap-4 md:grid-cols-2">
      <Link
        to="/rooms"
        className="group/card rise relative flex h-56 flex-col justify-end overflow-hidden rounded-3xl border border-transparent bg-surface-container p-6 transition-all hover:-translate-y-1 hover:border-gold/40 hover:bg-surface-high md:h-64"
        style={{ animationDelay: '0.3s' }}
      >
        <div className="absolute -right-6 -top-6 opacity-10 transition-all group-hover/card:rotate-6 group-hover/card:opacity-25">
          <Icon name="celebration" fill className="!text-[140px] text-gold" />
        </div>
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold transition-colors group-hover/card:bg-gold group-hover/card:text-on-gold">
          <Icon name="celebration" />
        </div>
        <h3 className="font-display text-2xl">PARTY ROOM</h3>
        <p className="mt-1 text-sm text-on-variant">
          Friends anywhere. Chain movies live, or disguise a story and make them
          sweat.
        </p>
        <div className="mt-4 flex items-center justify-between border-t border-surface-highest pt-3">
          <span className="text-[11px] font-bold tracking-[0.15em] text-success-bright">
            LIVE MULTIPLAYER
          </span>
          <Icon
            name="arrow_forward"
            className="text-on-variant transition-all group-hover/card:translate-x-1 group-hover/card:text-gold"
          />
        </div>
      </Link>
      <Link
        to="/play/living"
        className="group/card rise relative flex h-56 flex-col justify-end overflow-hidden rounded-3xl border border-transparent bg-surface-container p-6 transition-all hover:-translate-y-1 hover:border-urgent-soft/40 hover:bg-surface-high md:h-64"
        style={{ animationDelay: '0.38s' }}
      >
        <div className="absolute -right-6 -top-6 opacity-10 transition-all group-hover/card:-rotate-6 group-hover/card:opacity-25">
          <Icon name="theater_comedy" fill className="!text-[140px] text-urgent-soft" />
        </div>
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-urgent-soft/30 bg-urgent-deep/40 text-urgent-soft transition-colors group-hover/card:bg-urgent-deep">
          <Icon name="theater_comedy" />
        </div>
        <h3 className="font-display text-2xl">LIVING ROOM</h3>
        <p className="mt-1 text-sm text-on-variant">
          One phone, two teams. Describe, sing, act, and out-trivia each other.
        </p>
        <div className="mt-4 flex items-center justify-between border-t border-surface-highest pt-3">
          <span className="text-[11px] font-bold tracking-[0.15em] text-urgent-soft">
            SAME COUCH
          </span>
          <Icon
            name="arrow_forward"
            className="text-on-variant transition-all group-hover/card:translate-x-1 group-hover/card:text-urgent-soft"
          />
        </div>
      </Link>
    </section>
  )

  const stats = (
    <section className="rise rounded-3xl bg-surface-container p-6" style={{ animationDelay: '0.44s' }}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-xl text-gold-bright">YOUR REEL</h3>
        <Icon name="emoji_events" fill className="text-gold" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          ['Points', `${pts} ⭐`],
          ['Best run', `${nstats.bestRun}`],
          ['Runs', `${nstats.runs}`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-surface p-4 text-center">
            <p className="text-[11px] font-bold tracking-[0.12em] text-on-variant">
              {String(k).toUpperCase()}
            </p>
            <p className="mt-1 font-display text-2xl text-gold">{v}</p>
          </div>
        ))}
      </div>
    </section>
  )

  return (
    <>
      {/* ---------- Mobile ---------- */}
      <div className="flex flex-col gap-6 md:hidden">
        {hero}
        <div className="rise" style={{ animationDelay: '0.28s' }}>
          <DialogueTicker />
        </div>
        {modes}
        <Link
          to="/rooms"
          className="marquee-glow rise flex items-center justify-center gap-2 rounded-full bg-gold py-4 font-display text-lg tracking-wider text-on-gold active:scale-95"
          style={{ animationDelay: '0.42s' }}
        >
          <Icon name="celebration" fill />
          CREATE PARTY ROOM
        </Link>
        <Link
          to="/rooms"
          className="-mt-2 text-center text-sm text-gold underline underline-offset-4"
        >
          Join with code
        </Link>
        {stats}
      </div>

      {/* ---------- Desktop ---------- */}
      <div className="hidden flex-col gap-8 md:flex">
        {hero}
        <div className="rise" style={{ animationDelay: '0.26s' }}>
          <DialogueTicker />
        </div>
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 flex flex-col gap-6">
            <h3 className="rise font-display text-2xl" style={{ animationDelay: '0.28s' }}>
              GAME MODES
            </h3>
            {modes}
          </div>
          <div className="flex flex-col gap-6">
            <h3 className="rise font-display text-2xl" style={{ animationDelay: '0.28s' }}>
              TONIGHT
            </h3>
            {stats}
            <Link
              to="/rooms"
              className="rise rounded-3xl border border-gold/30 bg-surface-container p-6 transition-all hover:-translate-y-1 hover:bg-surface-high"
              style={{ animationDelay: '0.5s' }}
            >
              <div className="flex items-center gap-3">
                <Icon name="pin" className="text-gold" />
                <div>
                  <p className="font-bold">Have a room code?</p>
                  <p className="text-sm text-on-variant">Jump straight in →</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
