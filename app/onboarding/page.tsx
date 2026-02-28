'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Building2, ImageIcon, Globe, ChevronLeft, ChevronRight, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import imageCompression from 'browser-image-compression'

const STEPS = [
  { id: 1, title_es: 'Tu información', title_en: 'Your Info', icon: User },
  { id: 2, title_es: 'Tu empresa', title_en: 'Your Company', icon: Building2 },
  { id: 3, title_es: 'Branding', title_en: 'Branding', icon: ImageIcon },
  { id: 4, title_es: 'Preferencias', title_en: 'Preferences', icon: Globe },
] as const

const MAGIC_TEXTS = [
  { es: 'Creando tu organización...', en: 'Creating your organization...' },
  { es: 'Configurando tu dashboard...', en: 'Setting up your business dashboard...' },
  { es: 'Preparando tu Asesor IA...', en: 'Tailoring your AI Advisor...' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showMagic, setShowMagic] = useState(false)
  const [magicIndex, setMagicIndex] = useState(0)
  const [lang, setLang] = useState<'es' | 'en'>('en')

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [slogan, setSlogan] = useState('')
  const [website, setWebsite] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [platformLang, setPlatformLang] = useState<'es' | 'en'>('en')
  const [proposalLang, setProposalLang] = useState<'es' | 'en'>('es')
  const [orgId, setOrgId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/access')
        return
      }
      setUserId(user.id)

      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, phone, company_name, organization_id, language_preference')
        .eq('id', user.id)
        .single()

      if (prof) {
        setFullName(prof.full_name || '')
        setPhone(prof.phone || '')
        setCompanyName(prof.company_name || '')
        setOrgId(prof.organization_id)
        const l = (prof.language_preference as 'es' | 'en') || 'en'
        setLang(l)
        setPlatformLang(l)
        setProposalLang(l === 'en' ? 'en' : 'es')
      }

      if (prof?.organization_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('name, company_slogan, website, logo_url')
          .eq('id', prof.organization_id)
          .single()
        if (org) {
          setCompanyName(org.name || '')
          setSlogan(org.company_slogan || '')
          setWebsite(org.website || '')
          setLogoUrl(org.logo_url || null)
        }
      }

      setLoading(false)
    }
    load()
  }, [router, supabase])

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !orgId) return
    setLogoUploading(true)
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 512,
        useWebWorker: true,
        fileType: 'image/png',
      })
      const ext = file.name.toLowerCase().endsWith('.png') ? 'png' : 'jpg'
      const path = `${orgId}/logo.${ext}`
      const { error: upErr } = await supabase.storage
        .from('org-logos')
        .upload(path, compressed, { upsert: true, contentType: `image/${ext}` })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('org-logos').getPublicUrl(path)
      const url = `${urlData.publicUrl}?t=${Date.now()}`
      setLogoUrl(url)
      toast.success(lang === 'es' ? 'Logo subido' : 'Logo uploaded')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLogoUploading(false)
    }
  }

  function canProceed() {
    if (step === 1) return fullName.trim().length > 0
    if (step === 2) return companyName.trim().length > 0
    return true
  }

  async function handleNext() {
    if (step < 4) {
      setStep(step + 1)
      return
    }
    await handleFinish()
  }

  async function handleFinish() {
    setSaving(true)
    setShowMagic(true)
    setMagicIndex(0)

    try {
      if (!userId) throw new Error('Not authenticated')

      await supabase.from('profiles').update({
        full_name: fullName.trim(),
        phone: phone.trim(),
        company_name: companyName.trim(),
        language_preference: platformLang,
        updated_at: new Date().toISOString(),
      }).eq('id', userId)

      if (orgId) {
        await supabase.from('organizations').update({
          name: companyName.trim(),
          company_slogan: slogan.trim() || null,
          website: website.trim() || null,
          logo_url: logoUrl || null,
          updated_at: new Date().toISOString(),
        }).eq('id', orgId)
      }

      for (let i = 0; i < MAGIC_TEXTS.length; i++) {
        setMagicIndex(i)
        await new Promise((r) => setTimeout(r, 1000))
      }

      await supabase.from('profiles').update({
        onboarding_completed: true,
        language_preference: platformLang,
        default_proposal_language: proposalLang,
        updated_at: new Date().toISOString(),
      }).eq('id', userId)

      router.replace('/dashboard')
    } catch (err: unknown) {
      setShowMagic(false)
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#2A2D35] border-t-[#A8FF3E] animate-spin" />
      </div>
    )
  }

  if (showMagic) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0F1117]"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#A8FF3E]/5 to-transparent" />
        <motion.div
          key={magicIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 text-center px-6"
        >
          <Sparkles className="h-16 w-16 text-[#A8FF3E] mx-auto mb-6 animate-pulse" />
          <p className="text-xl font-semibold text-white">
            {lang === 'es' ? MAGIC_TEXTS[magicIndex].es : MAGIC_TEXTS[magicIndex].en}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            {MAGIC_TEXTS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${i <= magicIndex ? 'w-8 bg-[#A8FF3E]' : 'w-2 bg-[#2A2D35]'}`}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F1117] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`flex items-center gap-1.5 ${step >= s.id ? 'text-[#A8FF3E]' : 'text-[#6B7280]'}`}
              >
                <s.icon className="h-4 w-4" />
                <span className="text-xs font-medium hidden sm:inline">
                  {lang === 'es' ? s.title_es : s.title_en}
                </span>
              </div>
            ))}
          </div>
          <div className="h-1.5 rounded-full bg-[#2A2D35] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-[#A8FF3E]"
              initial={{ width: 0 }}
              animate={{ width: `${(step / 4) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Card */}
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-[#1E2228] border border-[#2A2D35] rounded-2xl p-6 sm:p-8 shadow-xl"
        >
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                <h2 className="text-xl font-bold text-white">
                  {lang === 'es' ? 'Tu información' : 'Your Info'}
                </h2>
                <div>
                  <label className="text-sm text-[#6B7280] block mb-2">{lang === 'es' ? 'Nombre completo' : 'Full Name'}</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={lang === 'es' ? 'Tu nombre' : 'Your name'}
                    className="w-full h-12 px-4 rounded-xl bg-[#0F1117] border border-[#2A2D35] text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#A8FF3E]"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#6B7280] block mb-2">{lang === 'es' ? 'Teléfono' : 'Phone'}</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555 123 4567"
                    className="w-full h-12 px-4 rounded-xl bg-[#0F1117] border border-[#2A2D35] text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#A8FF3E]"
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                <h2 className="text-xl font-bold text-white">
                  {lang === 'es' ? 'Tu empresa' : 'Your Company'}
                </h2>
                <div>
                  <label className="text-sm text-[#6B7280] block mb-2">{lang === 'es' ? 'Nombre de la empresa' : 'Company Name'}</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder={lang === 'es' ? 'Ej: Techos ABC' : 'E.g. ABC Roofing'}
                    className="w-full h-12 px-4 rounded-xl bg-[#0F1117] border border-[#2A2D35] text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#A8FF3E]"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#6B7280] block mb-2">{lang === 'es' ? 'Slogan (opcional)' : 'Slogan (optional)'}</label>
                  <input
                    type="text"
                    value={slogan}
                    onChange={(e) => setSlogan(e.target.value)}
                    placeholder={lang === 'es' ? 'Tu roofing, tu tranquilidad' : 'Your roof, your peace of mind'}
                    className="w-full h-12 px-4 rounded-xl bg-[#0F1117] border border-[#2A2D35] text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#A8FF3E]"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#6B7280] block mb-2">{lang === 'es' ? 'Sitio web (opcional)' : 'Website (optional)'}</label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://..."
                    className="w-full h-12 px-4 rounded-xl bg-[#0F1117] border border-[#2A2D35] text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#A8FF3E]"
                  />
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                <h2 className="text-xl font-bold text-white">Branding</h2>
                <div>
                  <label className="text-sm text-[#6B7280] block mb-2">{lang === 'es' ? 'Logo de la empresa' : 'Company Logo'}</label>
                  <p className="text-xs text-[#6B7280] mb-3">
                    {lang === 'es' ? 'PNG transparente recomendado para modo oscuro y PDFs.' : 'Transparent PNG recommended for dark mode and white PDFs.'}
                  </p>
                  <div className="flex items-center gap-4">
                    <label className="flex-shrink-0 w-24 h-24 rounded-xl border-2 border-dashed border-[#2A2D35] flex items-center justify-center cursor-pointer hover:border-[#A8FF3E]/50 transition-colors overflow-hidden">
                      <input type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleLogoUpload} className="hidden" />
                      {logoUploading ? (
                        <Loader2 className="h-8 w-8 text-[#A8FF3E] animate-spin" />
                      ) : logoUrl ? (
                        <Image src={logoUrl} alt="Logo" width={96} height={96} className="object-contain" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-[#6B7280]" />
                      )}
                    </label>
                    <p className="text-sm text-[#6B7280]">
                      {lang === 'es' ? 'Hacé clic para subir' : 'Click to upload'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                <h2 className="text-xl font-bold text-white">
                  {lang === 'es' ? 'Preferencias' : 'Preferences'}
                </h2>
                <div>
                  <label className="text-sm text-[#6B7280] block mb-2">
                    {lang === 'es' ? 'Idioma de la plataforma' : 'Platform Language'}
                  </label>
                  <div className="flex gap-2">
                    {(['es', 'en'] as const).map((l) => (
                      <button
                        key={l}
                        onClick={() => { setPlatformLang(l); setLang(l) }}
                        className={`flex-1 h-12 rounded-xl font-medium transition-all ${
                          platformLang === l ? 'bg-[#A8FF3E] text-[#0F1117]' : 'bg-[#16191F] text-[#6B7280] border border-[#2A2D35]'
                        }`}
                      >
                        {l === 'es' ? 'Español' : 'English'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-[#6B7280] block mb-2">
                    {lang === 'es' ? 'Idioma de las propuestas' : 'Proposal Language'}
                  </label>
                  <div className="flex gap-2">
                    {(['es', 'en'] as const).map((l) => (
                      <button
                        key={l}
                        onClick={() => setProposalLang(l)}
                        className={`flex-1 h-12 rounded-xl font-medium transition-all ${
                          proposalLang === l ? 'bg-[#A8FF3E] text-[#0F1117]' : 'bg-[#16191F] text-[#6B7280] border border-[#2A2D35]'
                        }`}
                      >
                        {l === 'es' ? 'Español' : 'English'}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-[#6B7280] mt-2">
                    {lang === 'es' ? 'Las propuestas se generarán en este idioma por defecto.' : 'Proposals will be generated in this language by default.'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Nav */}
        <div className="flex justify-between mt-6">
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[#2A2D35] text-[#6B7280] hover:text-white hover:border-[#3A3D45] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
            {lang === 'es' ? 'Atrás' : 'Back'}
          </button>
          <button
            onClick={handleNext}
            disabled={!canProceed() || saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#A8FF3E] text-[#0F1117] font-semibold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {step === 4
              ? (saving ? (lang === 'es' ? 'Finalizando...' : 'Finishing...') : (lang === 'es' ? 'Finalizar' : 'Finish'))
              : (lang === 'es' ? 'Siguiente' : 'Next')}
            {step === 4 && !saving && <Sparkles className="h-4 w-4" />}
            {step < 4 && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
