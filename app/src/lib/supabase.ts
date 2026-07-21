import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  'https://itvsclrwtpcymaltnela.supabase.co'
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Null until VITE_SUPABASE_ANON_KEY is set in app/.env.local. */
export const supabase: SupabaseClient | null = anonKey
  ? createClient(url, anonKey)
  : null

export async function signInWithGoogle() {
  if (!supabase) return
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
  })
}

export async function signInWithEmail(
  email: string,
  password: string,
  mode: 'signin' | 'signup',
): Promise<string | null> {
  if (!supabase) return 'Not configured'
  const { error } =
    mode === 'signup'
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
  return error ? error.message : null
}
