const hints = [
  { label: 'DECADE', cost: 1, unlocked: false },
  { label: 'DIRECTOR', cost: 2, unlocked: false },
  { label: 'HERO', cost: 2, unlocked: false },
  { label: 'DIALOGUE', cost: 3, unlocked: false },
]

export default function Daily() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-on-surface/40">KATHA MODE</h1>
          <p className="text-xs font-bold tracking-[0.1em] text-on-variant">
            DAILY PUZZLE #142
          </p>
        </div>
        <div className="rounded-full bg-surface-container px-4 py-2 text-sm font-bold">
          ♡ 3 Tries Left
        </div>
      </header>

      <div className="rounded-3xl border border-gold/30 bg-surface-container p-6 text-center">
        <span className="text-2xl">🎬</span>
        <p className="mt-4 text-lg italic leading-relaxed">
          “A ghost hires a body to finish his unfinished business.”
        </p>
        <div className="mx-auto mt-5 h-px w-16 bg-outline/40" />
        <input
          placeholder="Guess the movie…"
          className="mt-5 w-full rounded-2xl bg-surface-high px-5 py-3.5 text-on-surface placeholder:text-on-variant/60 focus:outline-2 focus:outline-gold"
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs font-bold tracking-[0.1em] text-on-variant">
          UNLOCK HINTS
        </p>
        <p className="text-xs font-bold tracking-[0.1em] text-gold">COSTS 🔥</p>
      </div>
      <div className="-mt-2 grid grid-cols-2 gap-4">
        {hints.map((h) => (
          <button
            key={h.label}
            className="rounded-3xl bg-surface-container p-6 text-center active:scale-95"
          >
            <span className="text-2xl">🔒</span>
            <p className="mt-2 text-sm font-bold text-on-variant">
              {h.cost} 🔥
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
