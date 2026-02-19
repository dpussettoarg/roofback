'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const run = async () => {
      const code = searchParams.get('code')
      const hash = typeof window !== 'undefined' ? window.location.hash : ''

      // 1. Hash con access_token (magic link, OAuth con implicit flow)
      if (hash && hash.includes('access_token')) {
        try {
          const params = new URLSearchParams(hash.substring(1))
          const accessToken = params.get('access_token')
          const refreshToken = params.get('refresh_token')
          if (accessToken) {
            const { error: err } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            })
            if (err) {
              setError(err.message)
              return
            }
            window.history.replaceState(null, '', window.location.pathname)
            router.push('/dashboard')
            router.refresh()
            return
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Error procesando sesión')
          return
        }
      }

      // 2. Código PKCE (?code=) - intercambio en el cliente
      if (code) {
        try {
          const { error: err } = await supabase.auth.exchangeCodeForSession(code)
          if (err) {
            setError(err.message)
            return
          }
          const next = searchParams.get('next') || '/dashboard'
          router.push(next)
          router.refresh()
          return
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Error intercambiando código')
          return
        }
      }

      // 3. Sin tokens ni código
      router.replace('/login?error=auth')
    }

    run()
  }, [supabase, router, searchParams])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="text-[#008B99] hover:underline"
          >
            Volver al login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-[#008B99]" />
      <p className="text-slate-600">Iniciando sesión...</p>
    </div>
  )
}

/**
 * Página de callback de Supabase para OAuth y Magic Links.
 * Supabase envía los tokens en el hash (#access_token=...) - el servidor NUNCA los recibe.
 * Esta página cliente procesa el hash y establece la sesión.
 */
export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#008B99]" />
          <p className="text-slate-600">Iniciando sesión...</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  )
}
