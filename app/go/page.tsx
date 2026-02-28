'use client'

// Transit page — used after OAuth redirects to avoid loading Netlify-cached
// stale HTML for /dashboard. This page loads fresh (never cached), then
// navigates to /dashboard via client-side routing (no new HTML fetch).

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function GoPage() {
  const router = useRouter()

  useEffect(() => {
    async function redirect() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/access')
        return
      }
      const { data: prof } = await supabase
        .from('profiles')
        .select('organization_id, onboarding_completed')
        .eq('id', user.id)
        .single()

      if (!prof || !prof.organization_id || prof.onboarding_completed === false) {
        router.replace('/onboarding')
      } else {
        router.replace('/dashboard')
      }
    }
    redirect()
  }, [router])

  return (
    <div style={{ minHeight: '100vh', background: '#0F1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #A8FF3E', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
