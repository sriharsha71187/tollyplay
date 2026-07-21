import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import AuthForm from '../components/AuthForm'
import { loadStats } from '../game/niranjan'

export default function Profile() {
  const [user, setUser] = useState<User | null>(null)
  const stats = loadStats()

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setUser(session?.user ?? null),
    )
    return () => sub.subscription.unsubscribe()
  }, [])

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="font-display text-3xl">PROFILE</h1>

      <div className="flex items-center gap-4 rounded-3xl bg-surface-container p-6">
        {user?.user_metadata?.avatar_url ? (
          <img
            src={user.user_metadata.avatar_url}
            alt=""
            className="h-16 w-16 rounded-full"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-highest text-2xl">
            🎭
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-display text-xl">
            {user
              ? (user.user_metadata?.full_name ?? user.email ?? 'PLAYER')
              : 'GUEST'}
          </p>
          <p className="text-sm text-on-variant">
            ⭐ {stats.totalPoints} trivia points
          </p>
        </div>
      </div>

      {!user && supabase && <AuthForm />}
      {!user && !supabase && (
        <p className="rounded-3xl bg-surface-container p-5 text-center text-sm text-on-variant">
          Sign-in is almost ready — waiting on server keys.
        </p>
      )}
      {user && supabase && (
        <button
          onClick={() => supabase!.auth.signOut()}
          className="text-center text-sm text-on-variant underline"
        >
          Sign out
        </button>
      )}

      <div className="grid grid-cols-2 gap-4">
        {[
          ['Best run', stats.bestRun],
          ['Runs played', stats.runs],
          ['Wins', '—'],
          ['Deep cuts', '—'],
        ].map(([k, v]) => (
          <div key={String(k)} className="rounded-3xl bg-surface-container p-5">
            <p className="text-xs font-bold tracking-[0.1em] text-on-variant">
              {String(k).toUpperCase()}
            </p>
            <p className="mt-1 font-display text-2xl text-gold">{v}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
