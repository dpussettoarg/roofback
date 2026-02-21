'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { MobileNav } from '@/components/app/mobile-nav'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Loader2, LogOut, Globe, Building2, Mail, Phone, Link as LinkIcon, User, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import type { Profile } from '@/lib/types'
import { PricingCard } from '@/components/app/pricing-card'

export default function SettingsPage() {
  const { t, lang, setLang } = useI18n()
  const supabase = createClient()
  const router = useRouter()

  const [profile, setProfile] = useState<Partial<Profile>>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data as Profile)
        if (data.language) setLang(data.language as 'es' | 'en')
      }
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function update(field: string, value: string | number) {
    setProfile((p) => ({ ...p, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          company_name: profile.company_name,
          phone: profile.phone,
          contact_email: profile.contact_email,
          website: profile.website,
          default_hourly_rate: profile.default_hourly_rate,
          default_overhead_pct: profile.default_overhead_pct,
          default_margin_pct: profile.default_margin_pct,
          language: lang,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)

      if (error) throw error
      toast.success(t('settings.saved'))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center">
        <div className="w-full max-w-[430px] mx-auto px-5 space-y-4">
          {/* Skeleton header */}
          <div className="pt-12 pb-4 space-y-2">
            <div className="h-7 w-40 bg-[#1E2228] rounded-lg animate-pulse" />
            <div className="h-4 w-64 bg-[#1E2228] rounded-lg animate-pulse" />
          </div>
          {/* Skeleton cards */}
          <div className="h-72 bg-[#1E2228] border border-[#2A2D35] rounded-2xl animate-pulse" />
          <div className="h-44 bg-[#1E2228] border border-[#2A2D35] rounded-2xl animate-pulse" />
          <div className="h-16 bg-[#1E2228] border border-[#2A2D35] rounded-2xl animate-pulse" />
          <div className="h-48 bg-[#1E2228] border border-[#2A2D35] rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F1117] pb-24">
      {/* Header */}
      <div className="w-full max-w-[430px] mx-auto px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-white">{t('settings.title')}</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          {lang === 'es'
            ? 'Tu información aparece en los presupuestos'
            : 'Your info appears on estimates & quotes'}
        </p>
      </div>

      <div className="w-full max-w-[430px] mx-auto px-5 space-y-4">
        {/* Business Info Card */}
        <div className="bg-[#1E2228] border border-[#2A2D35] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <Building2 className="h-5 w-5 text-[#A8FF3E]" />
            <h3 className="text-sm font-semibold text-white">{t('settings.profile')}</h3>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-[#6B7280]">{t('settings.name')}</Label>
            <Input
              value={profile.full_name || ''}
              onChange={(e) => update('full_name', e.target.value)}
              placeholder="John Perez"
              className="input-dark h-12 rounded-lg bg-[#16191F] border-[#2A2D35] text-white placeholder:text-[#3A3F4B] focus:border-[#A8FF3E] focus:ring-[#A8FF3E]/20"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-[#6B7280]">{t('settings.company')}</Label>
            <Input
              value={profile.company_name || ''}
              onChange={(e) => update('company_name', e.target.value)}
              placeholder={lang === 'es' ? 'Ej: Techos Perez LLC' : 'E.g.: Perez Roofing LLC'}
              className="input-dark h-12 rounded-lg bg-[#16191F] border-[#2A2D35] text-white placeholder:text-[#3A3F4B] focus:border-[#A8FF3E] focus:ring-[#A8FF3E]/20"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-[#6B7280]">{t('settings.phone')}</Label>
            <Input
              value={profile.phone || ''}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="(555) 123-4567"
              type="tel"
              className="input-dark h-12 rounded-lg bg-[#16191F] border-[#2A2D35] text-white placeholder:text-[#3A3F4B] focus:border-[#A8FF3E] focus:ring-[#A8FF3E]/20"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-[#6B7280]">
              {lang === 'es' ? 'Email de contacto' : 'Contact email'}
            </Label>
            <Input
              value={profile.contact_email || ''}
              onChange={(e) => update('contact_email', e.target.value)}
              placeholder="info@myroofing.com"
              type="email"
              className="input-dark h-12 rounded-lg bg-[#16191F] border-[#2A2D35] text-white placeholder:text-[#3A3F4B] focus:border-[#A8FF3E] focus:ring-[#A8FF3E]/20"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-[#6B7280]">
              {lang === 'es' ? 'Pagina web' : 'Website'}
            </Label>
            <Input
              value={profile.website || ''}
              onChange={(e) => update('website', e.target.value)}
              placeholder="www.myroofing.com"
              className="input-dark h-12 rounded-lg bg-[#16191F] border-[#2A2D35] text-white placeholder:text-[#3A3F4B] focus:border-[#A8FF3E] focus:ring-[#A8FF3E]/20"
            />
          </div>
        </div>

        {/* Defaults Card */}
        <div className="bg-[#1E2228] border border-[#2A2D35] rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">{t('settings.defaults')}</h3>

          <div className="space-y-1.5">
            <Label className="text-xs text-[#6B7280]">{t('settings.hourlyRate')}</Label>
            <Input
              type="number"
              min="0"
              step="0.5"
              value={profile.default_hourly_rate || 35}
              onChange={(e) => update('default_hourly_rate', parseFloat(e.target.value) || 0)}
              className="input-dark h-12 rounded-lg bg-[#16191F] border-[#2A2D35] text-white placeholder:text-[#3A3F4B] focus:border-[#A8FF3E] focus:ring-[#A8FF3E]/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-[#6B7280]">{t('settings.overheadPct')}</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={profile.default_overhead_pct || 15}
                onChange={(e) => update('default_overhead_pct', parseFloat(e.target.value) || 0)}
                className="input-dark h-12 rounded-lg bg-[#16191F] border-[#2A2D35] text-white placeholder:text-[#3A3F4B] focus:border-[#A8FF3E] focus:ring-[#A8FF3E]/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[#6B7280]">{t('settings.marginPct')}</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={profile.default_margin_pct || 20}
                onChange={(e) => update('default_margin_pct', parseFloat(e.target.value) || 0)}
                className="input-dark h-12 rounded-lg bg-[#16191F] border-[#2A2D35] text-white placeholder:text-[#3A3F4B] focus:border-[#A8FF3E] focus:ring-[#A8FF3E]/20"
              />
            </div>
          </div>
        </div>

        {/* Language Card */}
        <div className="bg-[#1E2228] border border-[#2A2D35] rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Globe className="h-5 w-5 text-[#A8FF3E]" />
              <span className="text-sm font-semibold text-white">{t('settings.language')}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setLang('es')}
                className={`px-4 py-2 rounded-lg text-sm transition-all ${
                  lang === 'es'
                    ? 'bg-[#A8FF3E] text-[#0F1117] font-bold'
                    : 'bg-[#16191F] text-[#6B7280] border border-[#2A2D35]'
                }`}
              >
                Espanol
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-4 py-2 rounded-lg text-sm transition-all ${
                  lang === 'en'
                    ? 'bg-[#A8FF3E] text-[#0F1117] font-bold'
                    : 'bg-[#16191F] text-[#6B7280] border border-[#2A2D35]'
                }`}
              >
                English
              </button>
            </div>
          </div>
        </div>

        {/* Subscription Card */}
        <div className="bg-[#1E2228] border border-[#2A2D35] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2.5 mb-4">
            <CreditCard className="h-5 w-5 text-[#A8FF3E]" />
            {lang === 'es' ? 'Plan' : 'Plan'}
            {profile.subscription_status === 'active' && (
              <span className="ml-auto text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#A8FF3E]/10 text-[#A8FF3E]">
                {lang === 'es' ? 'Activo' : 'Active'}
              </span>
            )}
          </h3>
          {profile.subscription_status !== 'active' ? (
            <PricingCard
              priceId="price_1T2ODTBiIxuQmwGuua83OmC0"
              title={lang === 'es' ? 'Pro' : 'Pro'}
              price="$9"
              period={lang === 'es' ? '/mes' : '/month'}
              features={
                lang === 'es'
                  ? ['Presupuestos ilimitados', 'PDF profesional', 'App movil optimizada']
                  : ['Unlimited estimates', 'Professional PDFs', 'Mobile-optimized app']
              }
              highlighted
              lang={lang as 'es' | 'en'}
              buttonLabel="subscribe"
            />
          ) : (
            <p className="text-sm text-[#6B7280]">
              {lang === 'es'
                ? 'Tu suscripcion esta activa. Gracias por elegir RoofBack.'
                : 'Your subscription is active. Thanks for choosing RoofBack.'}
            </p>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-lime w-full h-12 text-base font-semibold rounded-lg bg-[#A8FF3E] text-[#0F1117] hover:bg-[#9BEF35] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? t('settings.saving') : t('settings.save')}
        </button>

        <Separator className="bg-[#2A2D35]" />

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full h-12 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all flex items-center justify-center gap-2 text-sm font-medium"
        >
          <LogOut className="h-4 w-4" />
          {t('settings.logout')}
        </button>
      </div>

      <MobileNav />
    </div>
  )
}
