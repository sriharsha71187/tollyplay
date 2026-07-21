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
    options: { redirectTo: window.location.origin },
  })
}
