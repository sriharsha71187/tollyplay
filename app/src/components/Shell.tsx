import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/daily', label: 'Daily', icon: '📅' },
  { to: '/rooms', label: 'Rooms', icon: '👥' },
  { to: '/profile', label: 'Profile', icon: '👤' },
]

export default function Shell() {
  return (
    <div className="film-grain mx-auto flex min-h-dvh max-w-md flex-col bg-surface md:max-w-3xl">
      <main className="flex-1 px-5 pb-28 pt-6">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 rounded-t-[2rem] bg-surface-lowest/95 px-6 pb-5 pt-3 backdrop-blur md:max-w-3xl">
        <div className="flex items-center justify-between">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `flex min-w-16 flex-col items-center gap-1 rounded-full px-3 py-1 text-xs font-bold tracking-wider ${
                  isActive ? 'text-gold' : 'text-on-variant/70'
                }`
              }
            >
              <span className="text-xl">{t.icon}</span>
              {t.label.toUpperCase()}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
