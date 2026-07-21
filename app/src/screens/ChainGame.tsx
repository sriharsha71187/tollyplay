import { Link } from 'react-router-dom'

export default function ChainGame() {
  return (
    <div className="film-grain mx-auto flex min-h-dvh max-w-md flex-col bg-surface px-5 py-6">
      <header className="flex items-center justify-between">
        <Link to="/" className="text-on-variant">
          ← Exit
        </Link>
        <h1 className="font-display text-xl text-gold-bright">CHAIN</h1>
        <span className="font-display text-xl text-gold">0</span>
      </header>
      <div className="flex flex-1 items-center justify-center">
        <p className="text-on-variant">Game logic landing here next.</p>
      </div>
    </div>
  )
}
