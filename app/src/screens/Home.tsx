import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import { loadStats } from '../game/niranjan'

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
          className={`${i === 1 ? 'poster-tilt-l mt-6' : 'poster-tilt'} h-40 w-28 rounded-xl border border-gold/30 bg-gradient-to-b ${grad} p-2 shadow-2xl md:h-52 md:w-36`}
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

export default function Home() {
  const nstats = loadStats()

  const hero = (
    <section className="hero-backdrop group relative overflow-hidden rounded-3xl">
      <PosterStack />
      <div className="relative z-10 flex flex-col gap-4 p-6 pt-24 md:p-10 md:pt-36">
        <div className="flex w-max items-center gap-2 rounded-full border border-gold/50 bg-gold/15 px-4 py-1.5 backdrop-blur-md">
          <Icon name="local_fire_department" fill className="text-sm text-gold" />
          <span className="text-xs font-bold tracking-[0.15em] text-gold-bright">
            ENDLESS TRIVIA
          </span>
        </div>
        <h2 className="font-display text-5xl leading-none drop-shadow-lg md:text-7xl">
          EK NIRANJAN
        </h2>
        <p className="max-w-md text-on-variant md:text-lg">
          Three lives, no limit. Questions climb from blockbuster to deep cut —
          how far can you run?
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <Link
            to="/daily"
            className="marquee-glow-strong flex items-center gap-2 rounded-full bg-gold px-8 py-3.5 font-display text-lg tracking-wider text-on-gold transition-all hover:opacity-90 active:scale-95"
          >
            <Icon name="play_arrow" fill />
            START A RUN
          </Link>
          <div className="flex items-center gap-2 rounded-full border border-surface-highest bg-surface-container/60 px-4 py-2 text-sm text-on-variant backdrop-blur-sm">
            <Icon name="trophy" className="text-sm" />
            Best run {nstats.bestRun} · {nstats.totalPoints} pts banked
          </div>
        </div>
      </div>
    </section>
  )

  const modes = (
    <section className="grid gap-4 md:grid-cols-2">
      <Link
        to="/rooms"
        className="group relative flex h-56 flex-col justify-end overflow-hidden rounded-3xl border border-transparent bg-surface-container p-6 transition-colors hover:border-surface-highest hover:bg-surface-high md:h-64"
      >
        <div className="absolute -right-6 -top-6 opacity-10 transition-opacity group-hover:opacity-20">
          <Icon name="celebration" fill className="!text-[140px] text-gold" />
        </div>
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold transition-colors group-hover:bg-gold group-hover:text-on-gold">
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
            className="text-on-variant transition-colors group-hover:text-gold"
          />
        </div>
      </Link>
      <Link
        to="/play/living"
        className="group relative flex h-56 flex-col justify-end overflow-hidden rounded-3xl border border-transparent bg-surface-container p-6 transition-colors hover:border-surface-highest hover:bg-surface-high md:h-64"
      >
        <div className="absolute -right-6 -top-6 opacity-10 transition-opacity group-hover:opacity-20">
          <Icon name="theater_comedy" fill className="!text-[140px] text-urgent-soft" />
        </div>
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-urgent-soft/30 bg-urgent-deep/40 text-urgent-soft transition-colors group-hover:bg-urgent-deep group-hover:text-urgent-soft">
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
            className="text-on-variant transition-colors group-hover:text-urgent-soft"
          />
        </div>
      </Link>
    </section>
  )

  const stats = (
    <section className="rounded-3xl bg-surface-container p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-xl text-gold-bright">YOUR REEL</h3>
        <Icon name="emoji_events" fill className="text-gold" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          ['Points', `${nstats.totalPoints} ⭐`],
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
        {modes}
        <Link
          to="/rooms"
          className="marquee-glow flex items-center justify-center gap-2 rounded-full bg-gold py-4 font-display text-lg tracking-wider text-on-gold active:scale-95"
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
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 flex flex-col gap-6">
            <h3 className="font-display text-2xl">GAME MODES</h3>
            {modes}
          </div>
          <div className="flex flex-col gap-6">
            <h3 className="font-display text-2xl">TONIGHT</h3>
            {stats}
            <Link
              to="/rooms"
              className="rounded-3xl border border-gold/30 bg-surface-container p-6 transition-colors hover:bg-surface-high"
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
