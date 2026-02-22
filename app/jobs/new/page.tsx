'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { MobileNav } from '@/components/app/mobile-nav'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Search, User, Plus, X, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { JOB_TYPE_OPTIONS, ROOF_TYPE_OPTIONS } from '@/lib/templates'
import Link from 'next/link'
import { AddressInput } from '@/components/app/address-input'
import type { Customer } from '@/lib/types'

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
  const endY = 30 - Math.sin((angle * Math.PI) / 180) * 30
  return (
    <svg width="48" height="36" viewBox="0 0 48 36" fill="none">
      <line x1="6" y1="30" x2="42" y2="30" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      <line x1="6" y1="30" x2="6" y2={endY + 2} stroke={stroke} strokeWidth="2" strokeLinecap="round" />
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

  // Customer selection state
  const [orgId, setOrgId] = useState<string | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [newCustomerEmail, setNewCustomerEmail] = useState('')
  const [creatingCustomer, setCreatingCustomer] = useState(false)
  const customerSearchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function loadOrg() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()
      if (profile?.organization_id) {
        setOrgId(profile.organization_id)
        const { data: custs } = await supabase
          .from('customers')
          .select('*')
          .eq('organization_id', profile.organization_id)
          .order('full_name')
        setCustomers((custs as Customer[]) || [])
      }
    }
    loadOrg()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync form fields from selected customer
  function selectCustomer(c: Customer) {
    setSelectedCustomer(c)
    setForm(f => ({
      ...f,
      client_name: c.full_name,
      client_phone: c.phone,
      client_email: c.email,
      client_address: c.address,
    }))
    setShowCustomerDropdown(false)
    setCustomerSearch('')
  }

  function clearCustomer() {
    setSelectedCustomer(null)
    setForm(f => ({ ...f, client_name: '', client_phone: '', client_email: '', client_address: '' }))
  }

  async function handleCreateCustomer() {
    if (!newCustomerName.trim() || !orgId) return
    setCreatingCustomer(true)
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          organization_id: orgId,
          full_name: newCustomerName.trim(),
          phone: newCustomerPhone.trim(),
          email: newCustomerEmail.trim(),
          address: '',
          notes: '',
        })
        .select()
        .single()
      if (error) throw error
      const c = data as Customer
      setCustomers(prev => [...prev, c].sort((a, b) => a.full_name.localeCompare(b.full_name)))
      selectCustomer(c)
      setShowNewCustomerForm(false)
      setNewCustomerName('')
      setNewCustomerPhone('')
      setNewCustomerEmail('')
      toast.success(lang === 'es' ? 'Cliente creado' : 'Customer created')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setCreatingCustomer(false)
    }
  }

  const filteredCustomers = customers.filter(c =>
    c.full_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch) ||
    c.email.toLowerCase().includes(customerSearch.toLowerCase())
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error(lang === 'es' ? 'No estás autenticado' : 'Not authenticated')

      if (!form.client_name.trim()) {
        throw new Error(lang === 'es' ? 'El nombre del cliente es obligatorio' : 'Client name is required')
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('default_overhead_pct, default_margin_pct, organization_id')
        .eq('id', user.id)
        .maybeSingle()

      const insertPayload: Record<string, unknown> = {
        user_id: user.id,
        organization_id: profile?.organization_id || null,
        customer_id: selectedCustomer?.id || null,
        client_name: form.client_name.trim(),
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
      }

      if (form.lat !== null) insertPayload.lat = form.lat
      if (form.lng !== null) insertPayload.lng = form.lng

      const { data, error } = await supabase
        .from('jobs')
        .insert(insertPayload)
        .select('id')
        .maybeSingle()

      if (error) throw new Error(error.message)
      if (!data) throw new Error(lang === 'es' ? 'No se pudo crear el trabajo' : 'Could not create job')

      toast.success(lang === 'es' ? '¡Trabajo creado!' : 'Job created!')
      router.push(`/jobs/${data.id}/estimate`)
    } catch (err: unknown) {
      console.error('Job creation error:', err)
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
        <div className="mx-auto w-full max-w-2xl">
          <Link href="/jobs" className="inline-flex items-center text-sm mb-2" style={{ color: '#6B7280' }}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t('jobs.back')}
          </Link>
          <h1 className="text-2xl font-bold text-white">{t('jobs.newJob')}</h1>
        </div>
      </div>

      <form id="new-job-form" onSubmit={handleSubmit} className="mx-auto w-full px-4 py-5 space-y-5 max-w-2xl">

        {/* ══════════════════════════════════════════════
            SECTION 0 — CUSTOMER SELECTOR (CRM)
           ══════════════════════════════════════════════ */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#A8FF3E' }}>
            {lang === 'es' ? 'Cliente' : 'Customer'}
          </p>
          <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: '#1E2228', border: '1px solid #2A2D35' }}>
            {selectedCustomer ? (
              /* Selected customer card */
              <div className="flex items-center gap-3 bg-[#0F1117] border border-[#A8FF3E]/30 rounded-xl px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-[#A8FF3E]/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-[#A8FF3E]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{selectedCustomer.full_name}</p>
                  {selectedCustomer.phone && <p className="text-xs text-[#6B7280]">{selectedCustomer.phone}</p>}
                </div>
                <button type="button" onClick={clearCustomer} className="text-[#6B7280] hover:text-white p-1">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              /* Picker */
              <div className="space-y-2">
                {/* Search input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
                  <input
                    ref={customerSearchRef}
                    type="text"
                    value={customerSearch}
                    onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true) }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder={lang === 'es' ? 'Buscar cliente existente...' : 'Search existing customer...'}
                    className="w-full h-11 pl-10 pr-4 rounded-lg bg-[#0F1117] border border-[#2A2D35] text-white text-sm placeholder:text-[#4B5563] focus:outline-none focus:border-[#A8FF3E] transition-colors"
                  />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
                </div>

                {/* Dropdown results */}
                {showCustomerDropdown && (
                  <div className="relative z-10">
                    <div
                      className="absolute left-0 right-0 top-0 max-h-48 overflow-y-auto rounded-xl border border-[#2A2D35] bg-[#16191F] shadow-xl"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {filteredCustomers.length === 0 && (
                        <p className="px-4 py-3 text-xs text-[#6B7280]">
                          {lang === 'es' ? 'Sin resultados' : 'No results'}
                        </p>
                      )}
                      {filteredCustomers.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => selectCustomer(c)}
                          className="w-full text-left px-4 py-2.5 hover:bg-[#252830] transition-colors border-b border-[#2A2D35] last:border-0"
                        >
                          <p className="text-sm font-medium text-white">{c.full_name}</p>
                          {c.phone && <p className="text-xs text-[#6B7280]">{c.phone}</p>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Or create new */}
                <button
                  type="button"
                  onClick={() => { setShowNewCustomerForm(!showNewCustomerForm); setShowCustomerDropdown(false) }}
                  className="w-full h-10 rounded-lg border border-dashed border-[#2A2D35] text-[#A8FF3E] text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#A8FF3E]/5 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  {lang === 'es' ? 'Crear nuevo cliente' : 'Create new customer'}
                </button>

                {/* Inline new customer mini-form */}
                {showNewCustomerForm && (
                  <div className="bg-[#0F1117] border border-[#2A2D35] rounded-xl p-4 space-y-3 mt-1">
                    <p className="text-xs font-semibold text-[#A8FF3E]">
                      {lang === 'es' ? 'Nuevo cliente' : 'New customer'}
                    </p>
                    <input
                      autoFocus
                      value={newCustomerName}
                      onChange={e => setNewCustomerName(e.target.value)}
                      placeholder={lang === 'es' ? 'Nombre completo *' : 'Full name *'}
                      className="w-full h-11 rounded-lg bg-[#1E2228] border border-[#2A2D35] px-3 text-white text-sm placeholder:text-[#4B5563] focus:outline-none focus:border-[#A8FF3E]"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={newCustomerPhone}
                        onChange={e => setNewCustomerPhone(e.target.value)}
                        placeholder={lang === 'es' ? 'Teléfono' : 'Phone'}
                        type="tel"
                        className="h-11 rounded-lg bg-[#1E2228] border border-[#2A2D35] px-3 text-white text-sm placeholder:text-[#4B5563] focus:outline-none focus:border-[#A8FF3E]"
                      />
                      <input
                        value={newCustomerEmail}
                        onChange={e => setNewCustomerEmail(e.target.value)}
                        placeholder="Email"
                        type="email"
                        className="h-11 rounded-lg bg-[#1E2228] border border-[#2A2D35] px-3 text-white text-sm placeholder:text-[#4B5563] focus:outline-none focus:border-[#A8FF3E]"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowNewCustomerForm(false)}
                        className="flex-1 h-10 rounded-lg border border-[#2A2D35] bg-transparent text-[#6B7280] text-sm"
                      >
                        {lang === 'es' ? 'Cancelar' : 'Cancel'}
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateCustomer}
                        disabled={creatingCustomer || !newCustomerName.trim()}
                        className="flex-1 h-10 rounded-lg bg-[#A8FF3E] text-[#0F1117] font-bold text-sm disabled:opacity-50"
                      >
                        {creatingCustomer ? '...' : (lang === 'es' ? 'Crear' : 'Create')}
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-xs text-[#4B5563] text-center">
                  {lang === 'es'
                    ? 'O completá los datos manualmente abajo'
                    : 'Or fill in details manually below'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            SECTION 1 — CLIENT INFO (manual / override)
           ══════════════════════════════════════════════ */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#A8FF3E' }}>
            {t('jobs.sectionClient')}
          </p>
          <div className="rounded-xl p-4 space-y-4" style={{ backgroundColor: '#1E2228', border: '1px solid #2A2D35' }}>
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
            {/* Job Type chips */}
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

            {/* Roof Type chips */}
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

            {/* Square footage */}
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

            {/* Pitch selector */}
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
                      <span className="text-xs font-medium mt-1" style={{ color: isActive ? '#A8FF3E' : '#6B7280' }}>
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
      <div className="fixed left-0 right-0 z-50 px-4 pt-3 pb-20" style={{ bottom: 0, background: 'linear-gradient(to top, #0F1117 60%, transparent)' }}>
        <div className="mx-auto w-full max-w-2xl">
          <button
            type="submit"
            form="new-job-form"
            disabled={loading}
            className="btn-lime w-full h-14 rounded-xl text-base font-bold transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading
              ? (lang === 'es' ? 'Creando...' : 'Creating...')
              : (lang === 'es' ? 'Crear Trabajo →' : 'Create Job →')}
          </button>
        </div>
      </div>

      <MobileNav />
    </div>
  )
}
