import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl tracking-wide text-gold-bright">
          TOLLYPLAY
        </h1>
        <div className="flex items-center gap-1 rounded-full bg-surface-container px-3 py-1.5 text-sm font-bold">
          🔥 <span className="text-gold">5</span>
        </div>
      </header>

      {/* Daily Katha hero card */}
      <Link
        to="/daily"
        className="marquee-glow relative overflow-hidden rounded-3xl bg-surface-container p-6"
      >
        <p className="text-xs font-bold tracking-[0.1em] text-on-variant">
          DAILY KATHA · #142
        </p>
        <p className="mt-3 font-display text-2xl leading-snug">
          CAN YOU GUESS TODAY&apos;S MOVIE?
        </p>
        <p className="mt-2 text-sm text-on-variant">
          One cryptic story. Five stars on the line.
        </p>
        <span className="mt-4 inline-block rounded-full bg-gold px-5 py-2.5 font-display text-sm tracking-wider text-on-gold">
          PLAY TODAY&apos;S PUZZLE
        </span>
      </Link>

      {/* Play modes */}
      <Link
        to="/rooms"
        className="rounded-3xl bg-surface-container p-5 active:scale-[0.98]"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-xl">🎬 PARTY ROOM</p>
            <p className="mt-1 text-xs text-on-variant">
              Friends anywhere — Chain &amp; Story mode, live
            </p>
          </div>
          <span className="text-2xl text-on-variant">›</span>
        </div>
      </Link>
      <Link
        to="/play/living"
        className="rounded-3xl bg-surface-container p-5 active:scale-[0.98]"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-xl">🛋️ LIVING ROOM</p>
            <p className="mt-1 text-xs text-on-variant">
              Same room, teams — describe, sing, act, trivia
            </p>
          </div>
          <span className="text-2xl text-on-variant">›</span>
        </div>
      </Link>
    </div>
  )
}
