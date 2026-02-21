'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/landing/navbar'
import { Hero } from '@/components/landing/hero'
import { HowItWorks } from '@/components/landing/how-it-works'
import { Benefits } from '@/components/landing/benefits'
import { Pricing } from '@/components/landing/pricing'
import { Footer } from '@/components/landing/footer'
import type { LandingLang } from '@/lib/landing-translations'

export default function HomePage() {
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
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-slate-800 animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-white text-slate-900 antialiased">
      <Navbar lang={lang} onToggleLang={() => setLang(lang === 'es' ? 'en' : 'es')} />
      <Hero lang={lang} />
      <HowItWorks lang={lang} />
      <Benefits lang={lang} />
      <Pricing lang={lang} />
      <Footer lang={lang} />
    </div>
  )
}
