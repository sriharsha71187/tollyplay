import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { signInWithGoogle, supabase } from '../lib/supabase'
import { loadRecord } from '../game/daily'

export default function Profile() {
  const [user, setUser] = useState<User | null>(null)
  const daily = loadRecord()

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setUser(session?.user ?? null),
    )
    return () => sub.subscription.unsubscribe()
  }, [])

  return (
    <div className="flex flex-col gap-6">
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
            🔥 {daily?.streak ?? 0}-day streak
          </p>
        </div>
      </div>

      {!user &&
        (supabase ? (
          <button
            onClick={signInWithGoogle}
            className="rounded-full bg-gold py-4 font-display text-lg tracking-wider text-on-gold active:scale-95"
          >
            CONTINUE WITH GOOGLE
          </button>
        ) : (
          <p className="rounded-3xl bg-surface-container p-5 text-center text-sm text-on-variant">
            Sign-in is almost ready — waiting on server keys.
          </p>
        ))}
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
          ['Daily best streak', daily?.best ?? 0],
          ['Last score', daily ? `${daily.score}/5` : '—'],
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
