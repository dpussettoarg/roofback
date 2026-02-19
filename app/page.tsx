'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Página raíz. Si Supabase redirige a /#access_token=... (Site URL),
 * preservamos el hash y enviamos a /auth/callback para procesarlo.
 * El servidor nunca recibe el hash, por eso debemos manejarlo en el cliente.
 */
export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const hash = window.location.hash
    if (hash && hash.includes('access_token')) {
      window.location.href = '/auth/callback' + hash
      return
    }
    router.replace('/dashboard')
  }, [router])

  return null
}
