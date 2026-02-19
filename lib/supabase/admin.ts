import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn(
    '[RoofBack] SUPABASE_SERVICE_ROLE_KEY is not set. Webhook profile updates will fail.\n' +
    'Get it from: Supabase Dashboard → Settings → API → service_role key (secret)'
  )
}

/**
 * Supabase admin client with service_role key.
 * Use ONLY in server-side code (API routes, webhooks, Server Actions).
 * Bypasses RLS - never expose to the client.
 */
export const supabaseAdmin =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null
