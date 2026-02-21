'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { MobileNav } from '@/components/app/mobile-nav'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { JOB_TYPE_OPTIONS, ROOF_TYPE_OPTIONS, PITCH_OPTIONS } from '@/lib/templates'
import Link from 'next/link'
import { AddressInput } from '@/components/app/address-input'

const FILTERED_JOB_TYPES = JOB_TYPE_OPTIONS.filter((o) =>
  ['repair', 'reroof', 'new_roof', 'other'].includes(o.value)
)

const ALL_ROOF_TYPES = [
  ...ROOF_TYPE_OPTIONS,
  { value: 'tpo', label_es: 'TPO', label_en: 'TPO' },
]

const PITCH_VISUAL_OPTIONS = [
  { value: '2/12', angle: 9.46 },
  { value: '4/12', angle: 18.43 },
  { value: '6/12', angle: 26.57 },
  { value: '8/12', angle: 33.69 },
]

function PitchIcon({ angle, active }: { angle: number; active: boolean }) {
  const stroke = active ? '#A8FF3E' : '#6B7280'
  const endX = 40 - Math.cos((angle * Math.PI) / 180) * 30
  const endY = 30 - Math.sin((angle * Math.PI) / 180) * 30
  return (
    <svg width="48" height="36" viewBox="0 0 48 36" fill="none">
      {/* base line */}
      <line x1="6" y1="30" x2="42" y2="30" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      {/* vertical wall */}
      <line x1="6" y1="30" x2="6" y2={endY + 2} stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      {/* roof slope */}
      <line x1="6" y1={endY + 2} x2="42" y2="30" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

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
    lat: null as number | null,
    lng: null as number | null,
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
          lat: form.lat,
          lng: form.lng,
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
    <div className="min-h-screen pb-40" style={{ backgroundColor: '#0F1117' }}>
      {/* ── HEADER ── */}
      <div className="sticky top-0 z-30 px-4 pt-12 pb-4" style={{ backgroundColor: '#0F1117', borderBottom: '1px solid #2A2D35' }}>
        <div className="mx-auto w-full" style={{ maxWidth: 430 }}>
          <Link href="/jobs" className="inline-flex items-center text-sm mb-2" style={{ color: '#6B7280' }}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t('jobs.back')}
          </Link>
          <h1 className="text-2xl font-bold text-white">{t('jobs.newJob')}</h1>
        </div>
      </div>

      <form id="new-job-form" onSubmit={handleSubmit} className="mx-auto w-full px-4 py-5 space-y-5" style={{ maxWidth: 430 }}>

        {/* ══════════════════════════════════════════════
            SECTION 1 — CLIENT INFO
           ══════════════════════════════════════════════ */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#A8FF3E' }}>
            {t('jobs.sectionClient')}
          </p>
          <div className="rounded-xl p-4 space-y-4" style={{ backgroundColor: '#1E2228', border: '1px solid #2A2D35' }}>
            {/* Cliente */}
            <div className="space-y-1.5">
              <Label className="text-xs" style={{ color: '#6B7280' }}>{t('jobs.client')} *</Label>
              <Input
                value={form.client_name}
                onChange={(e) => update('client_name', e.target.value)}
                placeholder="John Smith"
                required
                className="input-dark h-12 rounded-lg text-base"
                style={{ backgroundColor: '#16191F', borderColor: '#2A2D35', color: '#FFFFFF' }}
              />
            </div>

            {/* Teléfono */}
            <div className="space-y-1.5">
              <Label className="text-xs" style={{ color: '#6B7280' }}>{t('jobs.phone')}</Label>
              <Input
                value={form.client_phone}
                onChange={(e) => update('client_phone', e.target.value)}
                placeholder="(555) 123-4567"
                type="tel"
                className="input-dark h-12 rounded-lg text-base"
                style={{ backgroundColor: '#16191F', borderColor: '#2A2D35', color: '#FFFFFF' }}
              />
            </div>

            {/* Dirección */}
            <div className="space-y-1.5">
              <Label className="text-xs" style={{ color: '#6B7280' }}>{t('jobs.address')} *</Label>
              <AddressInput
                value={form.client_address}
                onChange={(address, lat, lng) => setForm(f => ({ ...f, client_address: address, lat: lat ?? null, lng: lng ?? null }))}
                placeholder="123 Main St, City, TX"
                required
                lang={lang as 'es' | 'en'}
                className="input-dark"
              />
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            SECTION 2 — JOB DETAILS
           ══════════════════════════════════════════════ */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#A8FF3E' }}>
            {t('jobs.sectionJob')}
          </p>
          <div className="rounded-xl p-4 space-y-5" style={{ backgroundColor: '#1E2228', border: '1px solid #2A2D35' }}>

            {/* Job Type — Segmented Control */}
            <div className="space-y-1.5">
              <Label className="text-xs" style={{ color: '#6B7280' }}>{t('jobs.jobType')}</Label>
              <div className="flex flex-wrap gap-2">
                {FILTERED_JOB_TYPES.map((o) => {
                  const isActive = form.job_type === o.value
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => update('job_type', o.value)}
                      className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                      style={{
                        backgroundColor: isActive ? '#A8FF3E' : '#16191F',
                        color: isActive ? '#0F1117' : '#6B7280',
                        border: isActive ? '1px solid #A8FF3E' : '1px solid #2A2D35',
                        fontWeight: isActive ? 700 : 500,
                      }}
                    >
                      {lang === 'es' ? o.label_es : o.label_en}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Roof Type — Horizontal Scroll Chips */}
            <div className="space-y-1.5">
              <Label className="text-xs" style={{ color: '#6B7280' }}>{t('jobs.roofType')}</Label>
              <div className="overflow-x-auto flex gap-2 pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
                {ALL_ROOF_TYPES.map((o) => {
                  const isActive = form.roof_type === o.value
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => update('roof_type', o.value)}
                      className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm transition-all whitespace-nowrap"
                      style={{
                        backgroundColor: isActive ? '#A8FF3E' : '#16191F',
                        color: isActive ? '#0F1117' : '#6B7280',
                        border: isActive ? '1px solid #A8FF3E' : '1px solid #2A2D35',
                        fontWeight: isActive ? 600 : 400,
                      }}
                    >
                      {lang === 'es' ? o.label_es : o.label_en}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Square Footage */}
            <div className="space-y-1.5">
              <Label className="text-xs" style={{ color: '#6B7280' }}>{t('jobs.sqft')}</Label>
              <Input
                value={form.square_footage}
                onChange={(e) => update('square_footage', e.target.value)}
                placeholder="1500"
                type="number"
                min="0"
                className="input-dark h-12 rounded-lg text-lg font-semibold"
                style={{ backgroundColor: '#16191F', borderColor: '#2A2D35', color: '#FFFFFF' }}
              />
            </div>

            {/* Pitch — Visual Slope Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs" style={{ color: '#6B7280' }}>{t('jobs.pitch')}</Label>
              <div className="grid grid-cols-4 gap-2">
                {PITCH_VISUAL_OPTIONS.map((p) => {
                  const isActive = form.pitch === p.value
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => update('pitch', p.value)}
                      className="flex flex-col items-center justify-center py-3 rounded-lg transition-all"
                      style={{
                        backgroundColor: '#16191F',
                        border: isActive ? '2px solid #A8FF3E' : '1px solid #2A2D35',
                      }}
                    >
                      <PitchIcon angle={p.angle} active={isActive} />
                      <span
                        className="text-xs font-medium mt-1"
                        style={{ color: isActive ? '#A8FF3E' : '#6B7280' }}
                      >
                        {p.value === '8/12' ? '8/12+' : p.value}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs" style={{ color: '#6B7280' }}>{t('jobs.notes')}</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                placeholder={lang === 'es' ? 'Notas del trabajo...' : 'Job notes...'}
                rows={3}
                className="input-dark rounded-lg text-base"
                style={{ backgroundColor: '#16191F', borderColor: '#2A2D35', color: '#FFFFFF' }}
              />
            </div>
          </div>
        </div>
      </form>

      {/* ── STICKY BOTTOM CTA ── */}
      <div
        className="fixed left-0 right-0 z-50 px-4 pt-3 pb-20"
        style={{ bottom: 0, background: 'linear-gradient(to top, #0F1117 60%, transparent)' }}
      >
        <div className="mx-auto w-full" style={{ maxWidth: 430 }}>
          <button
            type="submit"
            form="new-job-form"
            disabled={loading}
            className="btn-lime w-full h-14 rounded-xl text-base font-bold transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading
              ? (lang === 'es' ? 'Creando...' : 'Creating...')
              : (lang === 'es' ? 'Crear Trabajo \u2192' : 'Create Job \u2192')
            }
          </button>
        </div>
      </div>

      <MobileNav />
    </div>
  )
}
