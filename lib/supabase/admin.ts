import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Returns a Supabase admin client that bypasses RLS.
 *
 * Call this inside each server-side request handler — NOT at module level —
 * so that missing env vars surface as clear runtime errors rather than
 * a silent null at module load time.
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL   — your project URL (safe to be public)
 *   SUPABASE_SERVICE_ROLE_KEY  — secret key (Supabase Dashboard → Settings → API)
 *
 * IMPORTANT: Use ONLY in server-side code (API routes, webhooks, Server Actions).
 * NEVER import this in a 'use client' component or any file that might be
 * bundled into the browser.
 */
export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!url) {
    throw new Error(
      '[RoofBack] CRITICAL: NEXT_PUBLIC_SUPABASE_URL is not set. ' +
      'Add it to Netlify: Site Settings → Environment variables.'
    )
  }
  if (!key) {
    throw new Error(
      '[RoofBack] CRITICAL: SUPABASE_SERVICE_ROLE_KEY is not set. ' +
      'Get it from Supabase Dashboard → Settings → API → service_role (secret key). ' +
      'Add it to Netlify: Site Settings → Environment variables. ' +
      'NEVER prefix with NEXT_PUBLIC_ — it must remain server-side only.'
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
 * Legacy nullable export — no callers found in codebase (2026-02).
 * Kept to prevent unexpected import errors during refactors.
 * Prefer getSupabaseAdmin() in all new code.
 *
 * Returns null when env vars are absent (build time, CI without secrets).
 * At runtime in production the vars must be set or the app will error.
 */
export const supabaseAdmin: SupabaseClient | null =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL.trim(),
        process.env.SUPABASE_SERVICE_ROLE_KEY.trim(),
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
    : null
