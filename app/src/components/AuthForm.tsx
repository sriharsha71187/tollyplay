import { useState } from 'react'
import { signInWithEmail, signInWithGoogle } from '../lib/supabase'

export default function AuthForm() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    setError(null)
    setNotice(null)
    const err = await signInWithEmail(email.trim(), password, mode)
    setBusy(false)
    if (err) setError(err)
    else if (mode === 'signup')
      setNotice('Account created! Check your email if confirmation is required.')
  }

  return (
    <div className="rounded-3xl bg-surface-container p-5">
      <div className="flex gap-2">
        {(['signin', 'signup'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-full px-4 py-2 text-sm font-bold ${
              mode === m ? 'bg-gold text-on-gold' : 'bg-surface-high text-on-variant'
            }`}
          >
            {m === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="mt-4 w-full rounded-2xl bg-surface-high px-5 py-3.5 placeholder:text-on-variant/50 focus:outline-2 focus:outline-gold"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="mt-3 w-full rounded-2xl bg-surface-high px-5 py-3.5 placeholder:text-on-variant/50 focus:outline-2 focus:outline-gold"
      />
      {error && <p className="mt-3 text-sm text-urgent-soft">✕ {error}</p>}
      {notice && <p className="mt-3 text-sm text-success">{notice}</p>}
      <button
        onClick={submit}
        disabled={busy || !email.trim() || password.length < 6}
        className="mt-4 w-full rounded-full bg-gold py-3.5 font-display tracking-wider text-on-gold active:scale-95 disabled:opacity-40"
      >
        {busy ? '…' : mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
      </button>
      <button
        onClick={signInWithGoogle}
        className="mt-3 w-full rounded-full bg-surface-high py-3.5 text-sm font-bold text-on-variant active:scale-95"
      >
        Continue with Google
      </button>
      <p className="mt-2 text-center text-xs text-on-variant/60">
        Password must be at least 6 characters.
      </p>
    </div>
  )
}
