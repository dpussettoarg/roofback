'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { X, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/hooks/useProfile'
import { useI18n } from '@/lib/i18n/context'

const LS_KEY = 'rb_tour_step'
type TourStep = '1' | '2' | '3' | '4' | 'done' | 'skipped'

const STEPS = [
  {
    step: '1' as const,
    title: { es: 'Creá tu primer cliente', en: 'Create your first customer' },
    desc: { es: 'Agregá los datos del cliente para poder crear un trabajo.', en: 'Add client info so you can create a job.' },
    cta: { es: 'Ir a Clientes', en: 'Go to Customers' },
    href: '/customers/new',
  },
  {
    step: '2' as const,
    title: { es: 'Creá tu primer trabajo', en: 'Create your first job' },
    desc: { es: 'Asociá el cliente y configurá los detalles del trabajo.', en: 'Link a client and set up the job details.' },
    cta: { es: 'Crear Trabajo', en: 'Create Job' },
    href: '/jobs/new',
  },
  {
    step: '3' as const,
    title: { es: 'Generá un presupuesto', en: 'Generate an estimate' },
    desc: { es: 'Usá la IA para crear un presupuesto en segundos.', en: 'Use AI to build a professional estimate in seconds.' },
    cta: { es: 'Ver mis trabajos', en: 'View my jobs' },
    href: '/jobs',
  },
  {
    step: '4' as const,
    title: { es: 'Envialo al cliente', en: 'Send it to your client' },
    desc: { es: 'Compartí el link para que el cliente firme digitalmente.', en: 'Share the link so your client can sign digitally.' },
    cta: { es: 'Ver mis trabajos', en: 'View my jobs' },
    href: '/jobs',
  },
]

export function OnboardingTour() {
  const { profile, loading } = useProfile()
  const { lang } = useI18n()
  const supabase = createClient()

  const [step, setStep] = useState<TourStep | null>(null)
  const [showModal, setShowModal] = useState(false)

  // Read localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY) as TourStep | null
    if (saved) setStep(saved)
  }, [])

  // Once profile loads: show welcome modal if first visit
  useEffect(() => {
    if (loading || profile?.onboarding_completed) return
    const saved = localStorage.getItem(LS_KEY)
    if (!saved) setShowModal(true)
  }, [loading, profile])

  const advance = useCallback((next: TourStep) => {
    localStorage.setItem(LS_KEY, next)
    setStep(next)
  }, [])

  const completeTour = useCallback(async () => {
    localStorage.setItem(LS_KEY, 'done')
    setStep('done')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('profiles')
          .update({ onboarding_completed: true })
          .eq('id', user.id)
      }
    } catch { /* non-fatal */ }
  }, [supabase])

  const skipTour = useCallback(() => {
    localStorage.setItem(LS_KEY, 'skipped')
    setStep('skipped')
    setShowModal(false)
  }, [])

  // Auto-detect whether current step is already complete
  const detectProgress = useCallback(async (currentStep: TourStep) => {
    if (currentStep === 'done' || currentStep === 'skipped') return
    if (!profile) return

    const orgId = profile.organization_id
    const userId = profile.id

    if (currentStep === '1') {
      if (!orgId) return
      const { count } = await supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
      if ((count ?? 0) > 0) advance('2')
    } else if (currentStep === '2') {
      let q = supabase.from('jobs').select('id', { count: 'exact', head: true })
      q = orgId ? q.eq('organization_id', orgId) : q.eq('user_id', userId)
      const { count } = await q
      if ((count ?? 0) > 0) advance('3')
    } else if (currentStep === '3') {
      let q = supabase.from('jobs').select('id', { count: 'exact', head: true }).gt('estimated_total', 0)
      q = orgId ? q.eq('organization_id', orgId) : q.eq('user_id', userId)
      const { count } = await q
      if ((count ?? 0) > 0) advance('4')
    } else if (currentStep === '4') {
      let q = supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .in('workflow_stage', ['sent', 'approved', 'materials_ordered', 'in_progress', 'completed', 'invoiced', 'paid'])
      q = orgId ? q.eq('organization_id', orgId) : q.eq('user_id', userId)
      const { count } = await q
      if ((count ?? 0) > 0) completeTour()
    }
  }, [profile, supabase, advance, completeTour])

  useEffect(() => {
    if (step && step !== 'done' && step !== 'skipped' && !loading) {
      detectProgress(step)
    }
  }, [step, loading, detectProgress])

  // --- Welcome modal ---
  if (showModal && !step) {
    return (
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={skipTour}
        />
        <div className="relative w-full max-w-sm mx-4 mb-4 sm:mb-0 bg-[#1E2228] border border-[#2A2D35] rounded-2xl p-6 shadow-2xl">
          <div className="text-4xl mb-3 text-center">👋</div>
          <h2 className="text-lg font-black text-white text-center mb-2">
            {lang === 'es' ? '¡Bienvenido a RoofBack!' : 'Welcome to RoofBack!'}
          </h2>
          <p className="text-[#9CA3AF] text-sm text-center mb-6 leading-relaxed">
            {lang === 'es'
              ? '¿Querés que te guiemos paso a paso para crear tu primer trabajo y enviarlo al cliente?'
              : 'Want us to guide you step by step to create your first job and send it to a client?'}
          </p>
          <button
            onClick={() => { setShowModal(false); advance('1') }}
            className="w-full h-12 rounded-xl bg-[#A8FF3E] text-[#0F1117] font-black text-sm mb-3 flex items-center justify-center gap-2 hover:bg-[#bfff6b] transition-colors"
          >
            {lang === 'es' ? 'Sí, guíame' : 'Yes, guide me'}
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={skipTour}
            className="w-full h-10 rounded-xl text-[#6B7280] text-sm font-medium hover:text-white transition-colors"
          >
            {lang === 'es' ? 'Ya conozco la app' : 'I already know the app'}
          </button>
        </div>
      </div>
    )
  }

  // --- Step banner ---
  if (!step || step === 'done' || step === 'skipped') return null

  const stepData = STEPS.find(s => s.step === step)
  if (!stepData) return null
  const stepIndex = STEPS.findIndex(s => s.step === step)
  const l = lang as 'es' | 'en'

  return (
    <div className="fixed bottom-[56px] left-0 right-0 z-40 px-3 pb-1.5">
      <div className="max-w-lg mx-auto bg-[#1E2228] border border-[#A8FF3E]/30 rounded-2xl shadow-xl shadow-black/40 overflow-hidden">
        {/* Progress bar */}
        <div
          className="h-0.5 bg-[#A8FF3E] transition-all duration-500"
          style={{ width: `${(stepIndex + 1) * 25}%` }}
        />

        <div className="px-4 pt-3 pb-1 flex items-start gap-3">
          {/* Step dots */}
          <div className="flex items-center gap-1 pt-1 flex-shrink-0">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i < stepIndex
                    ? 'w-2 h-2 bg-[#A8FF3E]'
                    : i === stepIndex
                    ? 'w-3 h-2 bg-[#A8FF3E]'
                    : 'w-2 h-2 bg-[#2A2D35]'
                }`}
              />
            ))}
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-[#A8FF3E] uppercase tracking-widest mb-0.5">
              {l === 'es' ? `Paso ${stepIndex + 1} de 4` : `Step ${stepIndex + 1} of 4`}
            </p>
            <p className="text-sm font-black text-white leading-tight">
              {stepData.title[l]}
            </p>
            <p className="text-[11px] text-[#9CA3AF] mt-0.5 leading-snug">
              {stepData.desc[l]}
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={skipTour}
            className="flex-shrink-0 text-[#4B5563] hover:text-[#9CA3AF] transition-colors p-0.5 mt-0.5"
            aria-label={l === 'es' ? 'Saltar tour' : 'Skip tour'}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 pt-2 pb-3 flex items-center justify-between">
          <Link
            href={stepData.href}
            className="h-9 px-4 rounded-xl bg-[#A8FF3E] text-[#0F1117] font-black text-[13px] flex items-center gap-1.5 hover:bg-[#bfff6b] transition-colors"
          >
            {stepData.cta[l]}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={skipTour}
            className="text-[11px] text-[#4B5563] hover:text-[#6B7280] transition-colors font-medium"
          >
            {l === 'es' ? 'Saltar tour' : 'Skip tour'}
          </button>
        </div>
      </div>
    </div>
  )
}
