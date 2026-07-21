export default function Profile() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-3xl">PROFILE</h1>
      <div className="flex items-center gap-4 rounded-3xl bg-surface-container p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-highest text-2xl">
          🎭
        </div>
        <div>
          <p className="font-display text-xl">PLAYER</p>
          <p className="text-sm text-on-variant">🔥 5-day streak</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[
          ['Wins', '—'],
          ['Deep cuts', '—'],
          ['Best streak', '—'],
          ['Favorite era', '—'],
        ].map(([k, v]) => (
          <div key={k} className="rounded-3xl bg-surface-container p-5">
            <p className="text-xs font-bold tracking-[0.1em] text-on-variant">
              {k.toUpperCase()}
            </p>
            <p className="mt-1 font-display text-2xl text-gold">{v}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
