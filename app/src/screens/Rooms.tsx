export default function Rooms() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-3xl">PARTY ROOMS</h1>
      <button className="marquee-glow rounded-full bg-gold py-4 font-display text-lg tracking-wider text-on-gold active:scale-95">
        CREATE ROOM
      </button>
      <div className="rounded-3xl bg-surface-container p-6">
        <p className="text-xs font-bold tracking-[0.1em] text-on-variant">
          JOIN WITH CODE
        </p>
        <input
          placeholder="ABC-123"
          className="mt-3 w-full rounded-2xl bg-surface-high px-5 py-3.5 text-center font-display text-2xl tracking-[0.3em] placeholder:text-on-variant/40 focus:outline-2 focus:outline-gold"
        />
      </div>
      <p className="text-center text-sm text-on-variant">
        Online rooms are coming — pass-the-phone Chain is playable now.
      </p>
    </div>
  )
}
