import { createBrowserClient } from '@supabase/ssr'
import { logger } from '@/lib/logger'

let client: ReturnType<typeof createBrowserClient> | null = null

const PLACEHOLDER_URL = 'https://placeholder.supabase.co'
const PLACEHOLDER_KEY = 'placeholder-anon-key-for-build'

export function createClient() {
  if (client) return client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ''

  if (!key || key.length < 10) {
    logger.error(
      '[RoofBack] Falta la variable de entorno SUPABASE_KEY.\n' +
      'Set NEXT_PUBLIC_SUPABASE_ANON_KEY in Netlify → Site settings → Environment variables.\n' +
      'Get it from: https://supabase.com/dashboard → Settings → API'
    )
  }
  if (!url || url.includes('placeholder') || url.includes('tu-proyecto')) {
    logger.error(
      '[RoofBack] Supabase URL missing or invalid.\n' +
      'Set NEXT_PUBLIC_SUPABASE_URL in Netlify → Site settings → Environment variables.'
    )
  }

  // Use placeholder values during build/prerender so createBrowserClient
  // doesn't throw — all real API calls will fail gracefully at runtime
  // if the real env vars aren't set (they always are on Netlify).
  client = createBrowserClient(
    url || PLACEHOLDER_URL,
    key || PLACEHOLDER_KEY
  )
  return client
}

export function resetClient() {
  client = null
}
