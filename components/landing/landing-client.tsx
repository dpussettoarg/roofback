'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/landing/navbar'
import { Hero } from '@/components/landing/hero'
import { Founder } from '@/components/landing/founder'
import { Comparison } from '@/components/landing/comparison'
import { Features } from '@/components/landing/features'
import { DashboardPreview } from '@/components/landing/dashboard-preview'
import { HowItWorks } from '@/components/landing/how-it-works'
import { Pricing } from '@/components/landing/pricing'
import { Footer } from '@/components/landing/footer'
import type { LandingLang } from '@/lib/landing-translations'

export function LandingClient() {
  const router = useRouter()
  const [lang, setLang] = useState<LandingLang>('es')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const hash = window.location.hash
    if (hash && hash.includes('access_token')) {
      window.location.href = '/login' + hash
      return
    }

    const supabase = createClient()
    supabase.auth.getSession().then(({ data }: { data: { session: unknown } }) => {
      if (data.session) {
        router.replace('/dashboard')
      } else {
        setReady(true)
      }
    })
  }, [router])

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0F1117]">
        <div className="w-8 h-8 rounded-full border-2 border-[#2A2D35] border-t-[#A8FF3E] animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-[#0F1117] text-white antialiased">
      <Navbar lang={lang} onToggleLang={() => setLang(lang === 'es' ? 'en' : 'es')} />
      <Hero lang={lang} />
      <Founder lang={lang} />
      <Comparison lang={lang} />
      <Features lang={lang} />
      <DashboardPreview lang={lang} />
      <HowItWorks lang={lang} />
      <Pricing lang={lang} />
      <Footer lang={lang} />
    </div>
  )
}
