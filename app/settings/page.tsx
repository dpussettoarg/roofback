'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { MobileNav } from '@/components/app/mobile-nav'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-400">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      <div className="bg-white border-b border-slate-100 px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">{t('settings.title')}</h1>
        <p className="text-sm text-slate-400 mt-0.5">{lang === 'es' ? 'Tu información aparece en los presupuestos' : 'Your info appears on estimates & quotes'}</p>
      </div>

      <div className="px-5 py-5 space-y-4">
        {/* Business Info */}
        <Card className="border-0 shadow-sm bg-white rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#008B99]" />
              {lang === 'es' ? 'Información del negocio' : 'Business Information'}
            </h3>
            <p className="text-xs text-slate-400">{lang === 'es' ? 'Esto aparece en los PDF y presupuestos que enviás' : 'This appears on PDFs and estimates you send'}</p>
            <div className="space-y-2">
              <Label className="text-[11px] text-slate-400 flex items-center gap-1"><User className="h-3 w-3" />{t('settings.name')}</Label>
              <Input
                value={profile.full_name || ''}
                onChange={(e) => update('full_name', e.target.value)}
                placeholder="John Pérez"
                className="h-12 text-base bg-slate-50/50 border-slate-200 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] text-slate-400 flex items-center gap-1"><Building2 className="h-3 w-3" />{t('settings.company')}</Label>
              <Input
                value={profile.company_name || ''}
                onChange={(e) => update('company_name', e.target.value)}
                placeholder={lang === 'es' ? 'Ej: Techos Pérez LLC' : 'E.g.: Perez Roofing LLC'}
                className="h-12 text-base bg-slate-50/50 border-slate-200 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[11px] text-slate-400 flex items-center gap-1"><Phone className="h-3 w-3" />{t('settings.phone')}</Label>
                <Input
                  value={profile.phone || ''}
                  onChange={(e) => update('phone', e.target.value)}
                  placeholder="(555) 123-4567"
                  className="h-12 text-base bg-slate-50/50 border-slate-200 rounded-xl"
                  type="tel"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] text-slate-400 flex items-center gap-1"><Mail className="h-3 w-3" />{lang === 'es' ? 'Email de contacto' : 'Contact email'}</Label>
                <Input
                  value={profile.contact_email || ''}
                  onChange={(e) => update('contact_email', e.target.value)}
                  placeholder="info@myroofing.com"
                  className="h-12 text-base bg-slate-50/50 border-slate-200 rounded-xl"
                  type="email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] text-slate-400 flex items-center gap-1"><LinkIcon className="h-3 w-3" />{lang === 'es' ? 'Página web' : 'Website'}</Label>
              <Input
                value={profile.website || ''}
                onChange={(e) => update('website', e.target.value)}
                placeholder="www.myroofing.com"
                className="h-12 text-base bg-slate-50/50 border-slate-200 rounded-xl"
              />
            </div>
          </CardContent>
        </Card>

        {/* Defaults */}
        <Card className="border-0 shadow-sm bg-white rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">{t('settings.defaults')}</h3>
            <div className="space-y-2">
              <Label className="text-[11px] text-slate-400">{t('settings.hourlyRate')}</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={profile.default_hourly_rate || 35}
                onChange={(e) => update('default_hourly_rate', parseFloat(e.target.value) || 0)}
                className="h-12 text-base bg-slate-50/50 border-slate-200 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[11px] text-slate-400">{t('settings.overheadPct')}</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={profile.default_overhead_pct || 15}
                  onChange={(e) => update('default_overhead_pct', parseFloat(e.target.value) || 0)}
                  className="h-12 text-base bg-slate-50/50 border-slate-200 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] text-slate-400">{t('settings.marginPct')}</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={profile.default_margin_pct || 20}
                  onChange={(e) => update('default_margin_pct', parseFloat(e.target.value) || 0)}
                  className="h-12 text-base bg-slate-50/50 border-slate-200 rounded-xl"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Language */}
        <Card className="border-0 shadow-sm bg-white rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-[#008B99]" />
                <span className="text-sm font-semibold text-slate-700">{t('settings.language')}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setLang('es')}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${lang === 'es' ? 'bg-gradient-brand text-white shadow-md' : 'bg-slate-100 text-slate-500'}`}
                >
                  Español
                </button>
                <button
                  onClick={() => setLang('en')}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${lang === 'en' ? 'bg-gradient-brand text-white shadow-md' : 'bg-slate-100 text-slate-500'}`}
                >
                  English
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card className="border-0 shadow-sm bg-white rounded-2xl">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4">
              <CreditCard className="h-4 w-4 text-[#008B99]" />
              {lang === 'es' ? 'Plan' : 'Plan'}
              {profile.subscription_status === 'active' && (
                <span className="ml-auto text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#78BE20]/10 text-[#3D7A00]">
                  {lang === 'es' ? 'Activo' : 'Active'}
                </span>
              )}
            </h3>
            {profile.subscription_status !== 'active' ? (
              <PricingCard
                priceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || 'price_TEST'}
                title={lang === 'es' ? 'Pro' : 'Pro'}
                price="$9"
                period={lang === 'es' ? '/mes' : '/month'}
                features={
                  lang === 'es'
                    ? ['Presupuestos ilimitados', 'PDF profesional', 'App móvil optimizada']
                    : ['Unlimited estimates', 'Professional PDFs', 'Mobile-optimized app']
                }
                highlighted
                lang={lang as 'es' | 'en'}
                buttonLabel="subscribe"
              />
            ) : (
              <p className="text-sm text-slate-500">
                {lang === 'es' ? 'Tu suscripción está activa. Gracias por elegir RoofBack.' : 'Your subscription is active. Thanks for choosing RoofBack.'}
              </p>
            )}
          </CardContent>
        </Card>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 text-base font-medium rounded-2xl btn-gradient flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? t('settings.saving') : t('settings.save')}
        </button>

        <Separator className="bg-slate-100" />

        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full h-12 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {t('settings.logout')}
        </Button>
      </div>

      <MobileNav />
    </div>
  )
}
