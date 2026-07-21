import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import Icon from './Icon'
import { loadStats } from '../game/niranjan'

const tabs = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/daily', label: 'Trivia', icon: 'quiz' },
  { to: '/rooms', label: 'Rooms', icon: 'groups' },
  { to: '/profile', label: 'Profile', icon: 'person' },
]

export default function Shell() {
  const nav = useNavigate()
  const points = loadStats().totalPoints
  return (
    <div className="film-grain flex min-h-dvh bg-surface">
      {/* Desktop sidebar */}
      <nav className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-surface-high bg-surface-low py-8 md:flex">
        <div className="px-6">
          <h1 className="font-display text-3xl tracking-wide text-gold-bright">
            TOLLYPLAY
          </h1>
          <p className="mt-2 text-xs font-bold tracking-[0.2em] text-gold/80">
            PREMIERE NIGHT
          </p>
        </div>
        <div className="mt-10 flex flex-1 flex-col gap-2 px-4">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `flex items-center gap-4 rounded-xl px-5 py-3 transition-all ${
                  isActive
                    ? 'marquee-glow bg-gold font-bold text-on-gold'
                    : 'text-on-variant hover:bg-surface-highest hover:text-on-surface'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={t.icon} fill={isActive} />
                  <span>{t.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
        <div className="px-4">
          <button
            onClick={() => nav('/rooms')}
            className="marquee-glow flex w-full items-center justify-center gap-2 rounded-full bg-gold py-3 font-display tracking-wider text-on-gold transition-all hover:opacity-90 active:scale-95"
          >
            <Icon name="add_circle" />
            CREATE ROOM
          </button>
        </div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between bg-surface/80 px-5 py-3 backdrop-blur-xl md:hidden">
          <div className="flex items-center gap-3">
            <div className="marquee-glow flex h-10 w-10 items-center justify-center rounded-full border-2 border-gold bg-surface-highest text-lg">
              🎭
            </div>
            <span className="font-display text-2xl tracking-wider text-gold-bright">
              TOLLYPLAY
            </span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-surface-container px-3 py-1.5 text-xs font-bold tracking-widest">
            <span className="text-on-variant">PTS</span>
            <span className="text-gold">{points}</span>
            <span className="text-base">⭐</span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-md flex-1 px-5 pb-32 pt-4 md:max-w-6xl md:px-10 md:pb-12 md:pt-10">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 z-40 flex w-full items-center justify-around rounded-t-2xl bg-surface-lowest/90 px-4 pb-6 pt-2 shadow-[0_-4px_20px_rgba(245,185,66,0.15)] backdrop-blur-md md:hidden">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `flex min-w-16 flex-col items-center justify-center rounded-xl p-2 ${
                isActive
                  ? 'bg-surface-highest/60 text-gold shadow-[0_0_15px_rgba(245,185,66,0.3)]'
                  : 'text-on-variant'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon name={t.icon} fill={isActive} />
                <span className="mt-1 text-[11px] font-bold tracking-[0.1em]">
                  {t.label.toUpperCase()}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
