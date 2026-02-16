import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (client) return client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ''

  if (!url || !key || url.includes('placeholder') || url.includes('tu-proyecto')) {
    console.error(
      '[RoofBack] Supabase credentials missing or invalid.\n' +
      'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local\n' +
      'Get them from: https://supabase.com/dashboard → Settings → API'
    )
  }

  client = createBrowserClient(url, key)
  return client
}

export function resetClient() {
  client = null
}
