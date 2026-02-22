import { redirect } from 'next/navigation'

/**
 * Diagnostic page — DEVELOPMENT ONLY.
 *
 * Access: /debug?secret=<DEBUG_PAGE_SECRET env var>
 *
 * Security rules:
 *  1. Blocked entirely in production (NODE_ENV === 'production').
 *  2. Requires DEBUG_PAGE_SECRET env var to be explicitly set — no
 *     hardcoded fallback, so a missing var always redirects to /login.
 *  3. If either check fails, redirects silently to /login (no 404 disclosure).
 */
export default async function DebugPage({
  searchParams,
}: {
  searchParams: Promise<{ secret?: string }>
}) {
  // Block in production entirely
  if (process.env.NODE_ENV === 'production') {
    redirect('/login')
  }

  // Require an explicitly set secret — no hardcoded default
  const SECRET = process.env.DEBUG_PAGE_SECRET
  if (!SECRET) {
    redirect('/login')
  }

  const params = await searchParams
  if (params.secret !== SECRET) {
    redirect('/login')
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()

  // Only log SET/MISSING — never log actual values
  console.log('[RoofBack Debug]', {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? 'SET' : 'MISSING',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey ? 'SET' : 'MISSING',
    NEXT_PUBLIC_SITE_URL: siteUrl ? 'SET' : 'MISSING',
    NODE_ENV: process.env.NODE_ENV,
  })

  const mask = (val: string | undefined) =>
    val && val.length >= 8 ? `${val.slice(0, 4)}…${val.slice(-4)}` : 'MISSING'

  return (
    <div className="min-h-screen bg-[#0F1117] p-8 font-mono text-sm">
      <h1 className="text-xl font-bold text-white mb-1">RoofBack — Env Diagnostics</h1>
      <p className="text-[#6B7280] mb-6 text-xs">Development only. Blocked in production.</p>

      <div className="space-y-2 max-w-lg">
        {[
          { label: 'NEXT_PUBLIC_SUPABASE_URL', val: supabaseUrl },
          { label: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', val: anonKey },
          { label: 'NEXT_PUBLIC_SITE_URL', val: siteUrl },
          { label: 'NODE_ENV', val: process.env.NODE_ENV },
          { label: 'SUPABASE_SERVICE_ROLE_KEY', val: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET (hidden)' : 'MISSING' },
          { label: 'ANTHROPIC_API_KEY', val: process.env.ANTHROPIC_API_KEY ? 'SET (hidden)' : 'MISSING' },
          { label: 'STRIPE_SECRET_KEY', val: process.env.STRIPE_SECRET_KEY ? 'SET (hidden)' : 'MISSING' },
        ].map(({ label, val }) => (
          <div key={label} className="flex justify-between gap-4 p-3 bg-[#1E2228] rounded-lg border border-[#2A2D35]">
            <span className="text-[#6B7280]">{label}</span>
            <span className={val ? 'text-[#A8FF3E]' : 'text-red-400'}>
              {label.startsWith('NODE_ENV') || label.includes('(hidden)') || !val
                ? (val || 'MISSING')
                : mask(val)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
