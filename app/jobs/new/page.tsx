'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { MobileNav } from '@/components/app/mobile-nav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { JOB_TYPE_OPTIONS, ROOF_TYPE_OPTIONS, PITCH_OPTIONS } from '@/lib/templates'
import Link from 'next/link'

export default function NewJobPage() {
  const [form, setForm] = useState({
    client_name: '',
    client_phone: '',
    client_email: '',
    client_address: '',
    job_type: 'repair',
    roof_type: 'shingle',
    square_footage: '',
    pitch: '4/12',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { t, lang } = useI18n()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No auth')

      const { data: profile } = await supabase
        .from('profiles')
        .select('default_overhead_pct, default_margin_pct')
        .eq('id', user.id)
        .single()

      const { data, error } = await supabase
        .from('jobs')
        .insert({
          user_id: user.id,
          client_name: form.client_name,
          client_phone: form.client_phone,
          client_email: form.client_email,
          client_address: form.client_address,
          job_type: form.job_type,
          roof_type: form.roof_type,
          square_footage: parseFloat(form.square_footage) || 0,
          pitch: form.pitch,
          notes: form.notes,
          overhead_pct: profile?.default_overhead_pct || 15,
          margin_pct: profile?.default_margin_pct || 20,
        })
        .select()
        .single()

      if (error) throw error

      toast.success(lang === 'es' ? '¡Trabajo creado!' : 'Job created!')
      router.push(`/jobs/${data.id}/estimate`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('common.error')
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }))

  return (
    <div className="min-h-screen pb-24">
      <div className="bg-white border-b px-4 pt-12 pb-4">
        <Link href="/jobs" className="inline-flex items-center text-sm text-gray-500 mb-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t('jobs.back')}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('jobs.newJob')}</h1>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
        {/* Cliente */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-gray-700">{t('jobs.client')}</h3>
            <div className="space-y-2">
              <Label>{t('jobs.client')} *</Label>
              <Input
                value={form.client_name}
                onChange={(e) => update('client_name', e.target.value)}
                placeholder="John Smith"
                className="h-12 text-base"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t('jobs.phone')}</Label>
              <Input
                value={form.client_phone}
                onChange={(e) => update('client_phone', e.target.value)}
                placeholder="(555) 123-4567"
                className="h-12 text-base"
                type="tel"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('jobs.address')} *</Label>
              <Input
                value={form.client_address}
                onChange={(e) => update('client_address', e.target.value)}
                placeholder="123 Main St, City, TX"
                className="h-12 text-base"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Detalles del trabajo */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-gray-700">
              {lang === 'es' ? 'Detalles del trabajo' : 'Job details'}
            </h3>
            <div className="space-y-2">
              <Label>{t('jobs.jobType')}</Label>
              <Select value={form.job_type} onValueChange={(v) => update('job_type', v)}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {lang === 'es' ? o.label_es : o.label_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('jobs.roofType')}</Label>
              <Select value={form.roof_type} onValueChange={(v) => update('roof_type', v)}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROOF_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {lang === 'es' ? o.label_es : o.label_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('jobs.sqft')}</Label>
                <Input
                  value={form.square_footage}
                  onChange={(e) => update('square_footage', e.target.value)}
                  placeholder="1500"
                  className="h-12 text-base"
                  type="number"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('jobs.pitch')}</Label>
                <Select value={form.pitch} onValueChange={(v) => update('pitch', v)}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PITCH_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('jobs.notes')}</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                placeholder={lang === 'es' ? 'Notas del trabajo...' : 'Job notes...'}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700"
        >
          {loading ? t('jobs.creating') : t('jobs.create')}
        </Button>
      </form>

      <MobileNav />
    </div>
  )
}
