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
import { Loader2, LogOut, Globe } from 'lucide-react'
import { toast } from 'sonner'
import type { Profile } from '@/lib/types'

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
    <div className="min-h-screen pb-24">
      <div className="bg-white border-b px-4 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Profile */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-gray-700">{t('settings.profile')}</h3>
            <div className="space-y-2">
              <Label>{t('settings.name')}</Label>
              <Input
                value={profile.full_name || ''}
                onChange={(e) => update('full_name', e.target.value)}
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('settings.company')}</Label>
              <Input
                value={profile.company_name || ''}
                onChange={(e) => update('company_name', e.target.value)}
                placeholder={lang === 'es' ? 'Ej: Techos Pérez LLC' : 'E.g.: Perez Roofing LLC'}
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('settings.phone')}</Label>
              <Input
                value={profile.phone || ''}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="(555) 123-4567"
                className="h-12 text-base"
                type="tel"
              />
            </div>
          </CardContent>
        </Card>

        {/* Defaults */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-gray-700">{t('settings.defaults')}</h3>
            <div className="space-y-2">
              <Label>{t('settings.hourlyRate')}</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={profile.default_hourly_rate || 35}
                onChange={(e) => update('default_hourly_rate', parseFloat(e.target.value) || 0)}
                className="h-12 text-base"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('settings.overheadPct')}</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={profile.default_overhead_pct || 15}
                  onChange={(e) => update('default_overhead_pct', parseFloat(e.target.value) || 0)}
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('settings.marginPct')}</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={profile.default_margin_pct || 20}
                  onChange={(e) => update('default_margin_pct', parseFloat(e.target.value) || 0)}
                  className="h-12 text-base"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Language */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-gray-400" />
                <span className="font-semibold text-gray-700">{t('settings.language')}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={lang === 'es' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLang('es')}
                  className={lang === 'es' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                >
                  Español
                </Button>
                <Button
                  variant={lang === 'en' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLang('en')}
                  className={lang === 'en' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                >
                  English
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 bg-emerald-600 hover:bg-emerald-700"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {saving ? t('settings.saving') : t('settings.save')}
        </Button>

        <Separator />

        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full h-12 text-red-500 hover:text-red-600 hover:bg-red-50"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {t('settings.logout')}
        </Button>
      </div>

      <MobileNav />
    </div>
  )
}
