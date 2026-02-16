import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (client) return client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  // During SSR/build with placeholders, create a dummy client
  // It won't work but won't crash the build either
  client = createBrowserClient(
    url || 'https://placeholder.supabase.co',
    key || 'placeholder-key'
  )
  return client
}
