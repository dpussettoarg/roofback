import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Returns a Supabase admin client that bypasses RLS.
 * Created lazily inside each request handler so missing env vars surface as
 * a clear runtime error rather than a silent null at module load time.
 *
 * REQUIRED env vars:
 *   NEXT_PUBLIC_SUPABASE_URL      — your project URL
 *   SUPABASE_SERVICE_ROLE_KEY     — from Supabase Dashboard → Settings → API → service_role (secret)
 *
 * Use ONLY in server-side code (API routes, webhooks, Server Actions).
 * NEVER expose to the browser.
 */
export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!url) {
    throw new Error(
      'CRITICAL: NEXT_PUBLIC_SUPABASE_URL is not set in environment variables'
    )
  }
  if (!key) {
    throw new Error(
      'CRITICAL: SUPABASE_SERVICE_ROLE_KEY is not set in environment variables. ' +
      'Get it from: Supabase Dashboard → Settings → API → service_role key (secret). ' +
      'Add it to Netlify: Site Settings → Environment variables.'
    )
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Legacy nullable export — kept for backward compatibility.
 * Prefer getSupabaseAdmin() in new code.
 */
export const supabaseAdmin =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL.trim(),
        process.env.SUPABASE_SERVICE_ROLE_KEY.trim(),
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
    : null
