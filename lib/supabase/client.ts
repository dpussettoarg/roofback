import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (client) return client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ''

  if (!key || key.length < 10) {
    console.error(
      '[RoofBack] Falta la variable de entorno SUPABASE_KEY.\n' +
      'Set NEXT_PUBLIC_SUPABASE_ANON_KEY in Netlify → Site settings → Environment variables.\n' +
      'Get it from: https://supabase.com/dashboard → Settings → API'
    )
  }
  if (!url || url.includes('placeholder') || url.includes('tu-proyecto')) {
    console.error(
      '[RoofBack] Supabase URL missing or invalid.\n' +
      'Set NEXT_PUBLIC_SUPABASE_URL in Netlify → Site settings → Environment variables.'
    )
  }

  client = createBrowserClient(url, key)
  return client
}

export function resetClient() {
  client = null
}
