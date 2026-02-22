'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { MobileNav } from '@/components/app/mobile-nav'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft, Plus, Trash2, Download, CheckCircle, Loader2,
  Send, Zap, List, Sparkles, CalendarDays, Clock, CreditCard,
  Globe, Wand2, Lock, Layers
} from 'lucide-react'
import { toast } from 'sonner'
import { JOB_TEMPLATES, scaleTemplateItems } from '@/lib/templates'
import { PAYMENT_TERMS_OPTIONS, translateMaterialName, formatJobNumber, formatEstimateNumber } from '@/lib/types'
import type { Job, EstimateItem, JobType, Profile } from '@/lib/types'
import { pdf } from '@react-pdf/renderer'
import { EstimatePDF } from '@/components/pdf/estimate-pdf'
import { ImageUploader } from '@/components/app/image-uploader'
import { TemplateSelector, type JobTemplate, type JobTemplateMaterial } from '@/components/app/template-selector'

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
}

function addDays(date: string, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

interface LocalItem {
  id?: string
  category: 'material' | 'labor' | 'other'
  name: string
  quantity: number
  unit: string
  unit_price: number
  sort_order: number
}

const QUICK_ADD_CHIPS = [
  { name: 'Shingles', category: 'material' as const, unit: 'sq', unit_price: 95 },
  { name: 'Underlayment', category: 'material' as const, unit: 'roll', unit_price: 65 },
  { name: 'Mano de obra', category: 'labor' as const, unit: 'sq', unit_price: 75 },
  { name: 'Flashings', category: 'material' as const, unit: 'each', unit_price: 25 },
  { name: 'Limpieza', category: 'other' as const, unit: 'job', unit_price: 300 },
]

export default function EstimatePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { t, lang } = useI18n()
  const supabase = createClient()

  const [job, setJob] = useState<Job | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  // Org branding for PDF header
  const [orgLogo, setOrgLogo] = useState<string | null>(null)
  const [orgAddress, setOrgAddress] = useState<string | null>(null)
  const [orgPhone, setOrgPhone] = useState<string | null>(null)
  const [orgEmail, setOrgEmail] = useState<string | null>(null)
  const [mode, setMode] = useState<'simple' | 'itemized'>('simple')
  const [items, setItems] = useState<LocalItem[]>([])
  const [overheadPct, setOverheadPct] = useState(15)
  const [marginPct, setMarginPct] = useState(20)
  const [simpleTotal, setSimpleTotal] = useState(0)
  const [simpleDescription, setSimpleDescription] = useState('')
  // Simple mode budget buckets
  const [simpleMaterials, setSimpleMaterials] = useState(0)
  const [simpleLabor, setSimpleLabor] = useState(0)
  const [simpleOther, setSimpleOther] = useState(0)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [improvingDesc, setImprovingDesc] = useState(false)
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [clientEmail, setClientEmail] = useState('')

  // New fields
  const [startDate, setStartDate] = useState('')
  const [durationDays, setDurationDays] = useState(1)
  const [paymentTerms, setPaymentTerms] = useState('50/50')
  const [languageOutput, setLanguageOutput] = useState<'es' | 'en'>('es')
  const [photos, setPhotos] = useState<string[]>([])

  // AI Proposal state
  const [aiNotes, setAiNotes] = useState('')
  const [aiProposal, setAiProposal] = useState('')
  const [generatingAi, setGeneratingAi] = useState(false)

  // System template picker
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)

  const deadlineDate = startDate ? addDays(startDate, durationDays) : ''

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (profileData) {
          setProfile(profileData as Profile)
          if (profileData.organization_id) {
            const { data: orgData } = await supabase
              .from('organizations')
              .select('logo_url,business_address,business_phone,business_email')
              .eq('id', profileData.organization_id)
              .single()
            if (orgData) {
              setOrgLogo(orgData.logo_url || null)
              setOrgAddress(orgData.business_address || null)
              setOrgPhone(orgData.business_phone || null)
              setOrgEmail(orgData.business_email || null)
            }
          }
        }
      }

      const { data: jobData } = await supabase.from('jobs').select('*').eq('id', id).single()
      if (!jobData) return
      const j = jobData as Job
      setJob(j)
      setMode(j.estimate_mode || 'simple')
      setOverheadPct(Number(j.overhead_pct) || 15)
      setMarginPct(Number(j.margin_pct) || 20)
      setSimpleDescription(j.simple_description || '')
      // Load budget buckets
      const mat = Number(j.simple_materials_budget) || 0
      const lab = Number(j.simple_labor_budget) || 0
      const oth = Number(j.simple_other_budget) || 0
      setSimpleMaterials(mat)
      setSimpleLabor(lab)
      setSimpleOther(oth)
      // If buckets are set, derive total from them; otherwise use stored total
      if (mat + lab + oth > 0) {
        const mp = Number(j.margin_pct) || 20
        setSimpleTotal(Math.round((mat + lab + oth) * (1 + mp / 100)))
      } else {
        setSimpleTotal(Number(j.estimated_total) || 0)
      }
      setClientEmail(j.client_email || '')
      setStartDate(j.start_date || '')
      setDurationDays(j.duration_days || 1)
      setPaymentTerms(j.payment_terms || '50/50')
      setLanguageOutput(j.language_output || 'es')
      setPhotos(j.photos || [])

      const { data: existingItems } = await supabase
        .from('estimate_items')
        .select('*')
        .eq('job_id', id)
        .order('sort_order')

      if (existingItems && existingItems.length > 0) {
        setItems(
          existingItems.map((ei: EstimateItem) => ({
            id: ei.id, category: ei.category, name: ei.name,
            quantity: Number(ei.quantity), unit: ei.unit,
            unit_price: Number(ei.unit_price), sort_order: ei.sort_order,
          }))
        )
      } else if (j.estimate_mode !== 'simple') {
        loadTemplate(j.job_type as JobType, Number(j.square_footage) || 1000)
      }
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function loadTemplate(jobType: JobType, sqft: number) {
    const template = JOB_TEMPLATES[jobType]
    if (!template) return
    const scaled = scaleTemplateItems(template.items, sqft)
    setItems(scaled.map((ti, idx) => ({
      category: ti.category, name: ti.name, quantity: ti.quantity,
      unit: ti.unit, unit_price: ti.unit_price, sort_order: idx,
    })))
  }

  function handleLoadSystemTemplate(template: JobTemplate, scaledItems: JobTemplateMaterial[]) {
    // Switch to itemized mode and populate with template items
    setMode('itemized')
    setItems(scaledItems.map((m, idx) => ({
      category: m.category,
      name: lang === 'es' ? m.name_es : m.name,
      quantity: m.quantity,
      unit: m.unit,
      unit_price: m.unit_price,
      sort_order: idx,
    })))
    // Auto-fill description with template description
    if (!simpleDescription.trim()) {
      setSimpleDescription(lang === 'es' ? template.description_es : template.description)
    }
    toast.success(
      lang === 'es'
        ? `Plantilla "${template.name_es}" cargada. ¡Editá los valores!`
        : `Template "${template.name}" loaded. Edit the values!`
    )
  }

  const updateItem = useCallback((index: number, field: string, value: string | number) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }, [])

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const addItem = useCallback((category: 'material' | 'labor' | 'other') => {
    setItems((prev) => [...prev, { category, name: '', quantity: 1, unit: category === 'labor' ? 'horas' : 'each', unit_price: 0, sort_order: prev.length }])
  }, [])

  const addQuickItem = useCallback((chip: typeof QUICK_ADD_CHIPS[number]) => {
    setItems((prev) => [...prev, {
      category: chip.category,
      name: chip.name,
      quantity: 1,
      unit: chip.unit,
      unit_price: chip.unit_price,
      sort_order: prev.length,
    }])
  }, [])

  const calc = useMemo(() => {
    const materials = items.filter((i) => i.category === 'material').reduce((s, i) => s + i.quantity * i.unit_price, 0)
    const labor = items.filter((i) => i.category === 'labor').reduce((s, i) => s + i.quantity * i.unit_price, 0)
    const other = items.filter((i) => i.category === 'other').reduce((s, i) => s + i.quantity * i.unit_price, 0)
    const subtotal = materials + labor + other
    const overhead = subtotal * (overheadPct / 100)
    const beforeMargin = subtotal + overhead
    const margin = beforeMargin * (marginPct / 100)
    const total = beforeMargin + margin
    return { materials, labor, other, subtotal, overhead, margin, total }
  }, [items, overheadPct, marginPct])

  const finalTotal = mode === 'simple' ? simpleTotal : calc.total
  const isLocked = job?.client_status === 'approved' || !!job?.approved_at

  async function handleImproveDescription() {
    if (!simpleDescription.trim() || !job) return
    setImprovingDesc(true)
    try {
      const res = await fetch('/api/ai/improve-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: simpleDescription,
          jobType: job.job_type,
          roofType: job.roof_type,
          squareFootage: Number(job.square_footage) || 0,
          language: languageOutput,
        }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else if (data.improved) {
        setSimpleDescription(data.improved)
        toast.success(
          data.source === 'ai'
            ? (lang === 'es' ? 'Descripción mejorada con IA' : 'Description improved with AI')
            : (lang === 'es' ? 'Descripción mejorada' : 'Description improved')
        )
      }
    } catch {
      toast.error(lang === 'es' ? 'Error mejorando descripción' : 'Error improving description')
    } finally {
      setImprovingDesc(false)
    }
  }

  async function handleGenerateAiProposal() {
    if (!aiNotes.trim() || !job) return
    setGeneratingAi(true)
    try {
      const res = await fetch('/api/ai/improve-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: aiNotes,
          jobType: job.job_type,
          roofType: job.roof_type,
          squareFootage: Number(job.square_footage) || 0,
          language: languageOutput,
        }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else if (data.improved) {
        setAiProposal(data.improved)
        setSimpleDescription(data.improved)
        toast.success(lang === 'es' ? 'Propuesta generada con IA' : 'AI proposal generated')
      }
    } catch {
      toast.error(lang === 'es' ? 'Error generando propuesta' : 'Error generating proposal')
    } finally {
      setGeneratingAi(false)
    }
  }

  async function handleSave(): Promise<boolean> {
    setSaving(true)
    try {
      if (mode === 'itemized') {
        const { error: delErr } = await supabase
          .from('estimate_items').delete().eq('job_id', id)
        if (delErr) throw new Error(`[estimate_items delete] ${delErr.message}`)

        if (items.length > 0) {
          const rows = items.map((item, idx) => ({
            job_id: id, category: item.category, name: item.name,
            quantity: item.quantity, unit: item.unit, unit_price: item.unit_price,
            total_price: item.quantity * item.unit_price, sort_order: idx,
          }))
          const { error: insErr } = await supabase.from('estimate_items').insert(rows)
          if (insErr) throw new Error(`[estimate_items insert] ${insErr.message}`)
        }
      }

      const { error: updErr } = await supabase.from('jobs').update({
        estimate_mode: mode,
        estimated_total: finalTotal,
        simple_description: mode === 'simple' ? simpleDescription : '',
        overhead_pct: overheadPct,
        margin_pct: marginPct,
        simple_materials_budget: mode === 'simple' ? simpleMaterials : 0,
        simple_labor_budget: mode === 'simple' ? simpleLabor : 0,
        simple_other_budget: mode === 'simple' ? simpleOther : 0,
        start_date: startDate || null,
        duration_days: durationDays,
        deadline_date: deadlineDate || null,
        payment_terms: paymentTerms,
        language_output: languageOutput,
        photos,
        updated_at: new Date().toISOString(),
      }).eq('id', id)

      if (updErr) throw new Error(`[jobs update] ${updErr.message}`)

      // Re-fetch so React state has the latest DB row, including
      // public_token which is set by a DB DEFAULT on first INSERT and
      // would be missing from stale in-memory state.
      const { data: refreshed, error: fetchErr } = await supabase
        .from('jobs').select('*').eq('id', id).single()
      if (fetchErr) throw new Error(`[jobs refetch] ${fetchErr.message}`)
      if (refreshed) setJob(refreshed as Job)

      toast.success(lang === 'es' ? '¡Presupuesto guardado!' : 'Estimate saved!')
      return true
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`${lang === 'es' ? 'Error al guardar' : 'Save failed'}: ${msg}`)
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleAccepted() {
    const saved = await handleSave()
    if (!saved) return  // save already showed the error toast, bail out

    const { error: apprErr } = await supabase.from('jobs').update({
      status: 'approved',
      workflow_stage: 'approved',
      client_status: 'approved',
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id)

    if (apprErr) {
      toast.error(`${lang === 'es' ? 'Error al aprobar' : 'Approval failed'}: ${apprErr.message}`)
      return
    }

    toast.success(lang === 'es' ? '¡Presupuesto aprobado!' : 'Estimate approved!')
    // router.refresh() invalidates Next.js router cache so /jobs/[id]
    // re-fetches from Supabase and shows the Execution Dashboard.
    router.refresh()
    router.push(`/jobs/${id}`)
  }

  function getProposalUrl() {
    if (!job?.public_token) return null
    return `${window.location.origin}/proposal/${job.public_token}`
  }

  function handleSendToClient() {
    const proposalUrl = getProposalUrl()
    if (!proposalUrl) {
      toast.error(lang === 'es' ? 'Guardá el presupuesto primero para generar el link' : 'Save the estimate first to generate the link')
      return
    }
    const isEn = languageOutput === 'en'
    const jobLabel = job?.job_number ? formatEstimateNumber(job.job_number, job.estimate_version || 1) : ''
    const subject = encodeURIComponent(isEn ? `Estimate ${jobLabel} for ${job?.client_name} - RoofBack` : `Presupuesto ${jobLabel} - ${job?.client_name}`)
    const body = encodeURIComponent(isEn
      ? `Hi ${job?.client_name},\n\nYou can view and approve your estimate here:\n${proposalUrl}\n\nThanks!`
      : `Hola ${job?.client_name},\n\nAcá podés ver y aprobar tu presupuesto:\n${proposalUrl}\n\nGracias!`)
    window.open(`mailto:${clientEmail}?subject=${subject}&body=${body}`, '_blank')
    setShowSendDialog(false)
  }

  function handleCopyLink() {
    const proposalUrl = getProposalUrl()
    if (!proposalUrl) {
      toast.error(lang === 'es' ? 'Guardá el presupuesto primero para generar el link' : 'Save the estimate first to generate the link')
      return
    }
    navigator.clipboard.writeText(proposalUrl)
    toast.success(lang === 'es' ? '¡Link copiado!' : 'Link copied!')
  }

  async function handleGeneratePdf() {
    if (!job) return

    // Guard: ensure minimum required data is present before handing to @react-pdf/renderer.
    // Missing strings cause react-pdf Text nodes to crash with cryptic internal errors.
    const clientName = (job.client_name || '').trim() || 'Client'
    const clientAddress = (job.client_address || '').trim()
    const clientEmail = (job.client_email || '').trim()
    const clientPhone = (job.client_phone || '').trim()
    const contractorName = (profile?.full_name || '').trim()
    const contractorCompany = (profile?.company_name || '').trim()
    const contractorPhone = (profile?.phone || '').trim()
    const contractorEmail = (profile?.contact_email || '').trim()
    const contractorWebsite = (profile?.website || '').trim()

    setGeneratingPdf(true)
    try {
      const isEn = languageOutput === 'en'

      const safeItems = items
        .filter((i) => i.name?.trim())   // skip blank rows
        .map((i) => ({
          name:       i.name.trim(),
          category:   i.category,
          quantity:   Number(i.quantity)   || 0,
          unit:       i.unit               || 'ea',
          unit_price: Number(i.unit_price) || 0,
        }))

      const pdfDoc = (
        <EstimatePDF
          mode={mode}
          isEn={isEn}
          clientName={clientName}
          clientAddress={clientAddress}
          clientEmail={clientEmail}
          clientPhone={clientPhone}
          contractorName={contractorName}
          contractorCompany={contractorCompany}
          contractorPhone={contractorPhone}
          contractorEmail={contractorEmail}
          contractorWebsite={contractorWebsite}
          companyLogoUrl={orgLogo}
          businessAddress={orgAddress}
          businessPhone={orgPhone}
          businessEmail={orgEmail}
          jobId={job.id}
          jobNumber={job.job_number}
          estimateVersion={job.estimate_version || 1}
          createdAt={job.created_at}
          startDate={startDate || ''}
          durationDays={durationDays || 1}
          paymentTerms={paymentTerms || ''}
          simpleDescription={simpleDescription || ''}
          items={safeItems}
          subtotalMaterials={calc.materials}
          subtotalLabor={calc.labor}
          subtotalOther={calc.other}
          overhead={calc.overhead}
          overheadPct={overheadPct}
          margin={calc.margin}
          marginPct={marginPct}
          total={finalTotal || 0}
          photos={photos.filter(Boolean)}
        />
      )

      const blob = await pdf(pdfDoc).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${isEn ? 'Estimate' : 'Presupuesto'}_${clientName.replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(lang === 'es' ? 'PDF descargado' : 'PDF downloaded')
      // Log the PDF generation in activity log
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user && job) {
          const jobNum = job.job_number ? `#J${String(job.job_number).padStart(4, '0')}` : ''
          await supabase.from('job_activity_log').insert({
            job_id: job.id,
            user_id: user.id,
            log_type: 'note',
            note: isEn
              ? `Quote ${jobNum} PDF generated`
              : `PDF de cotización ${jobNum} generado`,
            created_at: new Date().toISOString(),
          })
        }
      } catch {
        // non-critical — don't fail the PDF download
      }
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : String(err)
      console.error('[PDF generation] error:', detail, err)
      toast.error(
        lang === 'es'
          ? `Error generando PDF: ${detail}`
          : `PDF generation failed: ${detail}`
      )
    } finally {
      setGeneratingPdf(false)
    }
  }

  // --- Loading state ---
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0F1117]">
        <div className="w-8 h-8 rounded-full border-2 border-[#2A2D35] border-t-[#A8FF3E] animate-spin" />
      </div>
    )
  }

  // --- Locked / Read-only view (approved quote) ---
  if (job?.client_status === 'approved' || !!job?.approved_at) {
    return (
      <div className="min-h-screen bg-[#0F1117] pb-24 font-[Inter,sans-serif]">
        <div className="bg-[#0F1117] border-b border-[#2A2D35] px-5 pt-12 pb-4">
          <div className="w-full max-w-5xl mx-auto">
            <Link href={`/jobs/${id}`} className="inline-flex items-center text-sm text-[#6B7280] hover:text-[#A8FF3E] transition-colors mb-3">
              <ArrowLeft className="h-4 w-4 mr-1" />
              {job?.client_name}
            </Link>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">{lang === 'es' ? 'Presupuesto' : 'Estimate'}</h1>
              {job?.job_number && (
                <span className="text-sm font-mono font-bold text-[#A8FF3E] bg-[#A8FF3E]/10 px-2 py-0.5 rounded-md">
                  {formatEstimateNumber(job.job_number, job.estimate_version || 1)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="w-full max-w-5xl mx-auto px-5 py-5 space-y-4">
          {/* Approved badge */}
          <div className="bg-[#A8FF3E]/10 border border-[#A8FF3E]/40 rounded-[12px] p-4 flex items-start gap-3">
            <Lock className="h-5 w-5 text-[#A8FF3E] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-[#A8FF3E]">
                {lang === 'es' ? 'Presupuesto Aprobado — Solo Lectura' : 'Approved Estimate — Read Only'}
              </p>
              <p className="text-xs text-[#6B7280] mt-1">
                {job?.approved_at
                  ? `${lang === 'es' ? 'Aprobado el' : 'Approved on'} ${new Date(job.approved_at).toLocaleDateString(lang === 'es' ? 'es' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
                  : (lang === 'es' ? 'Este presupuesto está bloqueado.' : 'This estimate is locked.')}
              </p>
              {job?.client_signature && (
                <p className="text-xs text-[#9CA3AF] mt-1">
                  {lang === 'es' ? 'Firmado por: ' : 'Signed by: '}{job.client_signature}
                </p>
              )}
            </div>
          </div>

          {/* Approved total */}
          <div className="bg-[#1E2228] border border-[#2A2D35] border-t-2 border-t-[#A8FF3E] rounded-[12px] p-5 text-center space-y-1">
            <p className="text-xs text-[#6B7280] uppercase tracking-wider">{lang === 'es' ? 'Total aprobado' : 'Approved total'}</p>
            <p className="text-4xl font-bold text-[#A8FF3E] tabular-nums">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(job.estimated_total))}
            </p>
          </div>

          {/* Scope of work (simple mode) */}
          {job.simple_description && (
            <div className="bg-[#1E2228] border border-[#2A2D35] rounded-[12px] p-5 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                {lang === 'es' ? 'Alcance del trabajo' : 'Scope of work'}
              </p>
              <p className="text-sm text-[#D1D5DB] whitespace-pre-wrap leading-relaxed">{job.simple_description}</p>
            </div>
          )}

          {/* Line items (itemized mode) */}
          {items.length > 0 && (
            <div className="bg-[#1E2228] border border-[#2A2D35] rounded-[12px] p-5 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                {lang === 'es' ? 'Detalle del presupuesto' : 'Estimate breakdown'}
              </p>
              {['material', 'labor', 'other'].map((cat) => {
                const catItems = items.filter((i) => i.category === cat)
                if (catItems.length === 0) return null
                const catLabel = cat === 'material' ? (lang === 'es' ? 'Materiales' : 'Materials') : cat === 'labor' ? (lang === 'es' ? 'Mano de obra' : 'Labor') : (lang === 'es' ? 'Otros' : 'Other')
                return (
                  <div key={cat}>
                    <p className="text-[11px] font-semibold text-[#A8FF3E] uppercase tracking-wider mb-2">{catLabel}</p>
                    {catItems.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm py-1.5 border-b border-[#2A2D35] last:border-0">
                        <span className="text-[#D1D5DB]">{item.name} <span className="text-[#6B7280]">{item.quantity} {item.unit}</span></span>
                        <span className="text-white tabular-nums font-medium">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(item.quantity) * Number(item.unit_price))}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}

          {/* Payment & schedule */}
          {(job.start_date || job.payment_terms) && (
            <div className="bg-[#1E2228] border border-[#2A2D35] rounded-[12px] p-4 space-y-2 text-sm">
              {job.start_date && (
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">{lang === 'es' ? 'Fecha de inicio' : 'Start date'}</span>
                  <span className="text-white font-medium">{new Date(job.start_date + 'T12:00').toLocaleDateString(lang === 'es' ? 'es' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
              )}
              {job.payment_terms && (
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">{lang === 'es' ? 'Condiciones de pago' : 'Payment terms'}</span>
                  <span className="text-white font-medium">{job.payment_terms}</span>
                </div>
              )}
            </div>
          )}

          {/* PDF download */}
          <button
            onClick={handleGeneratePdf}
            disabled={generatingPdf}
            className="w-full h-12 rounded-[10px] border border-[#2A2D35] bg-[#1E2228] text-white hover:border-[#A8FF3E] hover:text-[#A8FF3E] transition-colors flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-40"
          >
            {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {lang === 'es' ? 'Descargar PDF del contrato' : 'Download contract PDF'}
          </button>

          <Link href={`/jobs/${id}`} className="block w-full h-11 rounded-[10px] btn-lime flex items-center justify-center gap-2 text-sm font-bold">
            <ArrowLeft className="h-4 w-4" />
            {lang === 'es' ? 'Volver al proyecto' : 'Back to project'}
          </Link>
        </div>

        <MobileNav />
        <style jsx global>{`
          .btn-lime { background-color:#A8FF3E; color:#0F1117; font-weight:700; cursor:pointer; transition:all 0.2s; }
          .btn-lime:hover { background-color:#95e636; }
          .input-dark { background-color:#16191F!important; border-color:#2A2D35!important; color:white!important; border-radius:8px; }
          .input-dark::placeholder { color:#4B5563!important; }
          .input-dark:focus { border-color:#A8FF3E!important; outline:none; }
          select option { background-color:#16191F; color:white; }
          input[type="date"]::-webkit-calendar-picker-indicator { filter:invert(1); }
        `}</style>
      </div>
    )
  }

  // --- Itemized section renderer ---
  const renderLineItems = () => {
    const allItems = items.map((item, idx) => ({ ...item, originalIndex: idx }))
    return (
      <div className="space-y-4">
        {/* Section header */}
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#A8FF3E] px-1">
          {t('estimate.materialsAndLabor') || (lang === 'es' ? 'Materiales y mano de obra' : 'Materials & Labor')}
        </h3>

        {/* Line items */}
        {allItems.map((item) => (
          <div
            key={item.originalIndex}
            className="bg-[#1E2228] border border-[#2A2D35] rounded-[10px] p-4 space-y-3"
          >
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <Label className="text-xs text-[#6B7280] mb-1 block">
                  {lang === 'es' ? 'Descripción' : 'Description'}
                </Label>
                <Input
                  value={item.name}
                  onChange={(e) => updateItem(item.originalIndex, 'name', e.target.value)}
                  placeholder={lang === 'es' ? 'Nombre del ítem' : 'Item name'}
                  className="input-dark h-10 text-sm font-medium"
                />
              </div>
              <button
                onClick={() => removeItem(item.originalIndex)}
                className="p-2 text-[#6B7280] hover:text-red-400 transition-colors mt-5"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-[#6B7280] mb-1 block">{t('estimate.qty')}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={item.quantity}
                  onChange={(e) => updateItem(item.originalIndex, 'quantity', parseFloat(e.target.value) || 0)}
                  className="input-dark h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-[#6B7280] mb-1 block">{t('estimate.unit')}</Label>
                <Input
                  value={item.unit}
                  onChange={(e) => updateItem(item.originalIndex, 'unit', e.target.value)}
                  className="input-dark h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-[#6B7280] mb-1 block">$/u</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unit_price}
                  onChange={(e) => updateItem(item.originalIndex, 'unit_price', parseFloat(e.target.value) || 0)}
                  className="input-dark h-9 text-sm"
                />
              </div>
            </div>
            <p className="text-right text-sm font-semibold text-white tabular-nums">
              = {formatMoney(item.quantity * item.unit_price)}
            </p>
          </div>
        ))}

        {/* Add item button */}
        <button
          onClick={() => addItem('material')}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-[#A8FF3E] hover:bg-[#A8FF3E]/5 rounded-[10px] border border-dashed border-[#2A2D35] hover:border-[#A8FF3E]/40 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {lang === 'es' ? 'Agregar ítem' : 'Add item'}
        </button>

        {/* Quick-add chips */}
        <div className="flex flex-wrap gap-2">
          {QUICK_ADD_CHIPS.map((chip) => (
            <button
              key={chip.name}
              onClick={() => addQuickItem(chip)}
              className="px-3 py-1.5 text-xs font-medium bg-[#16191F] border border-[#2A2D35] text-[#6B7280] rounded-full hover:border-[#A8FF3E] hover:text-[#A8FF3E] transition-colors"
            >
              {chip.name}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F1117] pb-28 font-[Inter,sans-serif]">
      {/* ===== HEADER ===== */}
      <div className="bg-[#0F1117] border-b border-[#2A2D35] px-5 pt-12 pb-4">
        <div className="w-full max-w-5xl mx-auto">
          <Link
            href={`/jobs/${id}`}
            className="inline-flex items-center text-sm text-[#6B7280] hover:text-[#A8FF3E] transition-colors mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {job?.client_name}
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">{t('estimate.title')}</h1>
            {job?.job_number && (
              <span className="text-sm font-mono font-bold text-[#A8FF3E] bg-[#A8FF3E]/10 px-2 py-0.5 rounded-md">
                {formatEstimateNumber(job.job_number, job.estimate_version || 1)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="w-full max-w-5xl mx-auto px-5 py-5 space-y-4">

        {/* ===== LANGUAGE OUTPUT TOGGLE (moved to top) ===== */}
        <div className="flex items-center justify-between bg-[#1E2228] border border-[#2A2D35] rounded-[12px] p-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-[#A8FF3E]" />
            <span className="text-sm font-medium text-white">{lang === 'es' ? 'Idioma de la propuesta' : 'Proposal language'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${languageOutput === 'es' ? 'text-[#A8FF3E]' : 'text-[#6B7280]'}`}>ES</span>
            <button
              onClick={() => setLanguageOutput(languageOutput === 'es' ? 'en' : 'es')}
              disabled={isLocked}
              className={`w-12 h-7 rounded-full transition-colors relative ${languageOutput === 'en' ? 'bg-[#A8FF3E]' : 'bg-[#2A2D35]'} disabled:opacity-50`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform shadow-sm ${languageOutput === 'en' ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className={`text-xs font-medium ${languageOutput === 'en' ? 'text-[#A8FF3E]' : 'text-[#6B7280]'}`}>EN</span>
          </div>
        </div>

        {/* ===== AI PROPOSAL SECTION ===== */}
        {!isLocked && (
        <div className="pulse-lime-border rounded-[12px] p-[2px]">
          <div className="bg-[#1E2228] rounded-[10px] p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#A8FF3E]/10 rounded-lg">
                <Sparkles className="h-5 w-5 text-[#A8FF3E]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  {t('estimate.aiTitle') || (lang === 'es' ? 'Propuesta con IA' : 'AI Proposal')}
                </h2>
                <p className="text-sm text-[#6B7280] mt-0.5">
                  {t('estimate.aiSubtitle') || (lang === 'es' ? 'Describí el trabajo y generamos el presupuesto' : 'Describe the job and we generate the estimate')}
                </p>
              </div>
            </div>
            <Textarea
              value={aiNotes}
              onChange={(e) => setAiNotes(e.target.value)}
              placeholder={lang === 'es'
                ? 'Ej: Retecho de 2000 sqft, shingles arquitectónicos, incluir remoción...'
                : 'E.g.: 2000 sqft reroof, architectural shingles, include tear-off...'}
              className="input-dark min-h-[80px] text-sm resize-none"
            />
            <button
              onClick={handleGenerateAiProposal}
              disabled={generatingAi || !aiNotes.trim()}
              className="btn-lime w-full h-11 rounded-[10px] flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {generatingAi ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {t('estimate.aiGenerate') || (lang === 'es' ? 'Generar propuesta' : 'Generate proposal')}
            </button>

            {/* AI disclaimer */}
            <p className="text-[11px] text-[#4B5563] text-center leading-relaxed">
              {lang === 'es'
                ? '⚠️ La IA puede cometer errores. Revisá siempre la propuesta antes de enviarla.'
                : '⚠️ AI can make mistakes. Always review the proposal before sending it to a client.'}
            </p>

            {/* AI generated proposal display */}
            {aiProposal && (
              <div className="space-y-3 pt-2">
                <Separator className="bg-[#2A2D35]" />
                <Textarea
                  value={aiProposal}
                  onChange={(e) => {
                    setAiProposal(e.target.value)
                    setSimpleDescription(e.target.value)
                  }}
                  className="input-dark min-h-[120px] text-sm resize-none"
                />
                <button
                  onClick={() => {
                    setAiProposal('')
                    handleGenerateAiProposal()
                  }}
                  disabled={generatingAi}
                  className="text-sm text-[#6B7280] hover:text-[#A8FF3E] transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Regenerar
                </button>
              </div>
            )}
          </div>
        </div>
        )}

        {/* ===== LOCKED BANNER ===== */}
        {isLocked && (
          <div className="bg-[#A8FF3E]/10 border border-[#A8FF3E]/30 rounded-[12px] p-4 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-[#A8FF3E] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#A8FF3E]">
                {lang === 'es' ? 'Presupuesto aprobado' : 'Estimate approved'}
              </p>
              <p className="text-xs text-[#6B7280] mt-1">
                {job?.approved_at
                  ? `${lang === 'es' ? 'Aprobado el' : 'Approved on'} ${new Date(job.approved_at).toLocaleDateString(lang === 'es' ? 'es' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
                  : (lang === 'es' ? 'Este presupuesto está bloqueado.' : 'This estimate is locked.')}
                {' '}{lang === 'es' ? '- Solo lectura' : '- Read only'}
              </p>
              {job?.client_signature && (
                <p className="text-xs text-[#9CA3AF] mt-1">
                  {lang === 'es' ? 'Firmado por: ' : 'Signed by: '}{job.client_signature}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ===== LOAD SYSTEM TEMPLATE BUTTON ===== */}
        {!isLocked && (
          <button
            onClick={() => setShowTemplateSelector(true)}
            className="w-full h-11 rounded-[10px] border border-dashed border-[#A8FF3E]/50 bg-[#A8FF3E]/5 text-[#A8FF3E] text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#A8FF3E]/10 transition-colors"
          >
            <Layers className="h-4 w-4" />
            {lang === 'es' ? 'Cargar plantilla de materiales' : 'Load materials template'}
          </button>
        )}

        {/* ===== MODE TOGGLE ===== */}
        <div className={`bg-[#1E2228] border border-[#2A2D35] rounded-lg p-1 flex ${isLocked ? 'opacity-70 pointer-events-none' : ''}`}>
          <button
            onClick={() => setMode('simple')}
            disabled={isLocked}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${
              mode === 'simple'
                ? 'bg-[#A8FF3E] text-[#0F1117] font-bold shadow-lg shadow-[#A8FF3E]/20'
                : 'text-[#6B7280]'
            }`}
          >
            <Zap className="h-4 w-4" />
            Simple
          </button>
          <button
            onClick={() => {
              setMode('itemized')
              if (items.length === 0 && job) loadTemplate(job.job_type as JobType, Number(job.square_footage) || 1000)
            }}
            disabled={isLocked}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${
              mode === 'itemized'
                ? 'bg-[#A8FF3E] text-[#0F1117] font-bold shadow-lg shadow-[#A8FF3E]/20'
                : 'text-[#6B7280]'
            }`}
          >
            <List className="h-4 w-4" />
            {lang === 'es' ? 'Detallado' : 'Itemized'}
          </button>
        </div>

        {/* ===== SIMPLE MODE ===== */}
        {mode === 'simple' && (
          <div className={`bg-[#1E2228] border border-[#2A2D35] rounded-[12px] p-5 space-y-5 ${isLocked ? 'opacity-80' : ''}`}>
            {/* Budget buckets */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#A8FF3E] mb-3">
                {lang === 'es' ? 'Presupuesto por categoría' : 'Budget by category'}
              </p>
              <div className="space-y-3">
                <div>
                  <Label className="text-[#6B7280] text-xs mb-1 block">
                    {lang === 'es' ? '1. Materiales estimados ($)' : '1. Estimated materials ($)'}
                  </Label>
                  <Input
                    type="number" min="0" step="100"
                    value={simpleMaterials || ''}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0
                      setSimpleMaterials(v)
                      setSimpleTotal(Math.round((v + simpleLabor + simpleOther) * (1 + marginPct / 100)))
                    }}
                    readOnly={isLocked}
                    placeholder="3,000"
                    className="input-dark h-11 text-base font-semibold"
                  />
                </div>
                <div>
                  <Label className="text-[#6B7280] text-xs mb-1 block">
                    {lang === 'es' ? '2. Mano de obra estimada ($)' : '2. Estimated labor ($)'}
                  </Label>
                  <Input
                    type="number" min="0" step="100"
                    value={simpleLabor || ''}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0
                      setSimpleLabor(v)
                      setSimpleTotal(Math.round((simpleMaterials + v + simpleOther) * (1 + marginPct / 100)))
                    }}
                    readOnly={isLocked}
                    placeholder="1,500"
                    className="input-dark h-11 text-base font-semibold"
                  />
                </div>
                <div>
                  <Label className="text-[#6B7280] text-xs mb-1 block">
                    {lang === 'es' ? '3. Otros gastos ($)' : '3. Other expenses ($)'}
                  </Label>
                  <Input
                    type="number" min="0" step="50"
                    value={simpleOther || ''}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0
                      setSimpleOther(v)
                      setSimpleTotal(Math.round((simpleMaterials + simpleLabor + v) * (1 + marginPct / 100)))
                    }}
                    readOnly={isLocked}
                    placeholder="200"
                    className="input-dark h-11 text-base font-semibold"
                  />
                </div>
                <div>
                  <Label className="text-[#6B7280] text-xs mb-1 block">
                    {lang === 'es' ? '4. Margen de ganancia deseado (%)' : '4. Desired profit margin (%)'}
                  </Label>
                  <Input
                    type="number" min="0" max="100" step="1"
                    value={marginPct || ''}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0
                      setMarginPct(v)
                      setSimpleTotal(Math.round((simpleMaterials + simpleLabor + simpleOther) * (1 + v / 100)))
                    }}
                    readOnly={isLocked}
                    placeholder="20"
                    className="input-dark h-11 text-base font-semibold"
                  />
                </div>
              </div>

              {/* Auto-calculated total */}
              {(simpleMaterials + simpleLabor + simpleOther) > 0 && (
                <div className="mt-4 p-3 bg-[#0F1117] rounded-[10px] border border-[#A8FF3E]/20">
                  <div className="flex justify-between text-xs text-[#6B7280] mb-1">
                    <span>{lang === 'es' ? 'Costo base' : 'Base cost'}</span>
                    <span className="tabular-nums">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(simpleMaterials + simpleLabor + simpleOther)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#6B7280] mb-2">
                    <span>{lang === 'es' ? `Ganancia (${marginPct}%)` : `Profit (${marginPct}%)`}</span>
                    <span className="tabular-nums">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format((simpleMaterials + simpleLabor + simpleOther) * (marginPct / 100))}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span className="text-sm text-white">{lang === 'es' ? 'Precio total al cliente' : 'Total client price'}</span>
                    <span className="text-lg text-[#A8FF3E] tabular-nums">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(simpleTotal)}</span>
                  </div>
                </div>
              )}

              {/* Fallback manual total (when no buckets filled) */}
              {(simpleMaterials + simpleLabor + simpleOther) === 0 && (
                <div className="mt-4">
                  <Label className="text-[#6B7280] text-xs mb-1 block">{lang === 'es' ? 'O ingresá el precio total directo' : 'Or enter total price directly'}</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-[#6B7280]">$</span>
                    <Input
                      type="number" min="0" step="100"
                      value={simpleTotal || ''}
                      onChange={(e) => setSimpleTotal(parseFloat(e.target.value) || 0)}
                      readOnly={isLocked}
                      placeholder="5,000"
                      className="input-dark h-14 text-2xl font-bold text-center tabular-nums pl-10 rounded-[12px]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[#6B7280] text-sm">
                  {lang === 'es' ? 'Descripción / Alcance' : 'Description / Scope'}
                </Label>
                {!isLocked && (
                  <button
                    type="button"
                    onClick={handleImproveDescription}
                    disabled={improvingDesc || !simpleDescription.trim()}
                    className="flex items-center gap-1.5 text-xs font-medium text-[#A8FF3E] hover:text-[#A8FF3E]/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors px-2 py-1 rounded-lg hover:bg-[#A8FF3E]/5"
                  >
                    {improvingDesc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                    {improvingDesc
                      ? (lang === 'es' ? 'Mejorando...' : 'Improving...')
                      : (lang === 'es' ? 'Mejorar con IA' : 'Improve with AI')}
                  </button>
                )}
              </div>
              <Textarea
                value={simpleDescription}
                onChange={(e) => setSimpleDescription(e.target.value)}
                readOnly={isLocked}
                placeholder={lang === 'es' ? 'Retecho completo de 2,000 sqft...' : 'Full reroof of 2,000 sqft...'}
                className="input-dark min-h-[120px] text-base resize-none"
              />
            </div>
          </div>
        )}

        {/* ===== ITEMIZED MODE ===== */}
        {mode === 'itemized' && (
          <div className={isLocked ? 'opacity-80 pointer-events-none' : ''}>
            {renderLineItems()}

            {/* Overhead / Margin / Totals */}
            <div className="bg-[#1E2228] border border-[#2A2D35] rounded-[12px] p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-[#6B7280] mb-1 block">{t('estimate.overheadPct')}</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={overheadPct}
                    onChange={(e) => setOverheadPct(parseFloat(e.target.value) || 0)}
                    className="input-dark h-10"
                  />
                </div>
                <div>
                  <Label className="text-xs text-[#6B7280] mb-1 block">{t('estimate.marginPct')}</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={marginPct}
                    onChange={(e) => setMarginPct(parseFloat(e.target.value) || 0)}
                    className="input-dark h-10"
                  />
                </div>
              </div>
              <Separator className="bg-[#2A2D35]" />
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">{t('estimate.subtotalMaterials')}</span>
                  <span className="text-white tabular-nums">{formatMoney(calc.materials)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">{t('estimate.subtotalLabor')}</span>
                  <span className="text-white tabular-nums">{formatMoney(calc.labor)}</span>
                </div>
                {calc.other > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">{t('estimate.subtotalOther')}</span>
                    <span className="text-white tabular-nums">{formatMoney(calc.other)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">{t('estimate.overhead')} ({overheadPct}%)</span>
                  <span className="text-white tabular-nums">{formatMoney(calc.overhead)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">{t('estimate.margin')} ({marginPct}%)</span>
                  <span className="text-white tabular-nums">{formatMoney(calc.margin)}</span>
                </div>
                <Separator className="bg-[#2A2D35]" />
                <div className="flex justify-between text-lg font-bold pt-1">
                  <span className="text-[#A8FF3E]">{t('estimate.grandTotal')}</span>
                  <span className="text-[#A8FF3E] tabular-nums">{formatMoney(calc.total)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== SCHEDULE & TERMS CARD ===== */}
        <div className={`bg-[#1E2228] border border-[#2A2D35] rounded-[12px] p-5 space-y-4 ${isLocked ? 'opacity-80 pointer-events-none' : ''}`}>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[#A8FF3E]" />
            {lang === 'es' ? 'Fechas y condiciones' : 'Schedule & Terms'}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-[#6B7280] mb-1 block">{lang === 'es' ? 'Fecha de inicio' : 'Start date'}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input-dark h-10 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-[#6B7280] mb-1 block">{lang === 'es' ? 'Duración (días)' : 'Duration (days)'}</Label>
              <Input
                type="number"
                min="1"
                value={durationDays}
                onChange={(e) => setDurationDays(parseInt(e.target.value) || 1)}
                className="input-dark h-10 text-sm"
              />
            </div>
          </div>
          {startDate && (
            <div className="flex items-center gap-2 p-3 rounded-[8px] bg-[#A8FF3E]/5 border border-[#A8FF3E]/20">
              <Clock className="h-4 w-4 text-[#A8FF3E]" />
              <span className="text-sm text-white">
                {lang === 'es' ? 'Fecha prometida: ' : 'Deadline: '}
                <strong>{new Date(deadlineDate + 'T12:00').toLocaleDateString(lang === 'es' ? 'es' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</strong>
              </span>
            </div>
          )}
          <div>
            <Label className="text-xs text-[#6B7280] mb-1 flex items-center gap-1">
              <CreditCard className="h-3 w-3" />
              {lang === 'es' ? 'Condiciones de pago' : 'Payment terms'}
            </Label>
            <select
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="w-full h-10 bg-[#16191F] border border-[#2A2D35] rounded-[8px] text-sm text-white px-3 mt-1 focus:outline-none focus:border-[#A8FF3E] transition-colors"
            >
              {PAYMENT_TERMS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{lang === 'es' ? opt.label_es : opt.label_en}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ===== PHOTOS SECTION ===== */}
        <div className={`bg-[#1E2228] border border-[#2A2D35] rounded-[12px] p-5 space-y-3 ${isLocked ? 'opacity-80' : ''}`}>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="text-[#A8FF3E]">📷</span>
            {lang === 'es' ? 'Fotos del trabajo' : 'Job Photos'}
          </h3>
          <ImageUploader
            urls={photos}
            onChange={setPhotos}
            storagePath={id}
            bucketName="job-photos"
            maxPhotos={10}
            disabled={isLocked}
            lang={lang}
          />
        </div>

        {/* ===== SUMMARY CARD ===== */}
        <div className="bg-[#1E2228] border border-[#2A2D35] border-t-[#A8FF3E] border-t-2 rounded-[12px] p-5 space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#6B7280]">{lang === 'es' ? 'Subtotal' : 'Subtotal'}</span>
              <span className="text-white tabular-nums">
                {formatMoney(mode === 'simple' ? simpleTotal : calc.subtotal)}
              </span>
            </div>
            {mode === 'itemized' && (
              <>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">{t('estimate.overhead')} ({overheadPct}%)</span>
                  <span className="text-white tabular-nums">{formatMoney(calc.overhead)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">{t('estimate.margin')} ({marginPct}%)</span>
                  <span className="text-white tabular-nums">{formatMoney(calc.margin)}</span>
                </div>
              </>
            )}
            <Separator className="bg-[#2A2D35]" />
            <div className="flex justify-between items-center pt-1">
              <span className="text-lg font-bold text-white">TOTAL</span>
              <span className="text-2xl font-bold text-[#A8FF3E] tabular-nums">
                {formatMoney(finalTotal)}
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleGeneratePdf}
              disabled={generatingPdf}
              className="w-full h-11 rounded-[10px] border border-[#2A2D35] text-white hover:border-[#A8FF3E] hover:text-[#A8FF3E] transition-colors flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-40"
            >
              {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {lang === 'es' ? 'Vista Previa del PDF' : 'Preview PDF'}
            </button>
            <button
              onClick={() => setShowSendDialog(true)}
              className="btn-lime w-full h-12 rounded-[10px] flex items-center justify-center gap-2 text-sm font-bold"
            >
              <Send className="h-4 w-4" />
              {lang === 'es' ? 'Enviar al Cliente' : 'Send to Client'} &rarr;
            </button>
          </div>
        </div>

        {/* ===== ACTIONS ===== */}
        <div className="space-y-3">
          {!isLocked && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-lime w-full h-12 rounded-[10px] flex items-center justify-center gap-2 text-base font-bold"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? t('estimate.saving') : t('estimate.save')}
            </button>
          )}
          <div className={`grid ${isLocked ? 'grid-cols-2' : 'grid-cols-3'} gap-2`}>
            <button
              onClick={handleGeneratePdf}
              disabled={generatingPdf}
              className="h-12 rounded-[10px] border border-[#2A2D35] bg-[#1E2228] text-white hover:border-[#A8FF3E] transition-colors flex items-center justify-center gap-1 text-sm font-medium"
            >
              {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              PDF
            </button>
            <button
              onClick={() => setShowSendDialog(true)}
              className="h-12 rounded-[10px] border border-[#2A2D35] bg-[#1E2228] text-[#A8FF3E] hover:border-[#A8FF3E] transition-colors flex items-center justify-center gap-1 text-sm font-medium"
            >
              <Send className="h-4 w-4" />
              {lang === 'es' ? 'Enviar' : 'Send'}
            </button>
            {!isLocked && (
              <button
                onClick={handleAccepted}
                className="h-12 rounded-[10px] border border-[#A8FF3E]/30 bg-[#1E2228] text-[#A8FF3E] hover:border-[#A8FF3E] transition-colors flex items-center justify-center gap-1 text-sm font-medium"
              >
                <CheckCircle className="h-4 w-4" />
                {lang === 'es' ? 'Aceptar' : 'Accept'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ===== SEND DIALOG (dark overlay + dark card modal) ===== */}
      {showSendDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSendDialog(false)}
          />
          <div className="relative bg-[#1E2228] border border-[#2A2D35] rounded-t-[20px] sm:rounded-[16px] w-full sm:max-w-md p-6 pb-8 space-y-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">
              {lang === 'es' ? 'Enviar presupuesto' : 'Send estimate'}
            </h3>
            <div className="space-y-2">
              <Label className="text-[#6B7280] text-sm">Email</Label>
              <Input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@email.com"
                className="input-dark h-12 rounded-[10px]"
              />
            </div>
            <div className="flex gap-2">
              <Input
                readOnly
                value={getProposalUrl() || (lang === 'es' ? 'Guardá primero para generar link' : 'Save first to generate link')}
                className="input-dark h-10 text-xs rounded-[8px] flex-1"
              />
              <button
                onClick={handleCopyLink}
                className="h-10 px-4 rounded-[8px] border border-[#2A2D35] bg-[#16191F] text-white text-sm font-medium hover:border-[#A8FF3E] transition-colors"
              >
                {lang === 'es' ? 'Copiar' : 'Copy'}
              </button>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowSendDialog(false)}
                className="flex-1 h-12 rounded-[10px] border border-[#2A2D35] bg-[#16191F] text-white text-sm font-medium hover:border-[#A8FF3E] transition-colors"
              >
                {lang === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleSendToClient}
                disabled={!clientEmail}
                className="btn-lime flex-1 h-12 rounded-[10px] flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {lang === 'es' ? 'Enviar' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== SYSTEM TEMPLATE SELECTOR MODAL ===== */}
      <TemplateSelector
        open={showTemplateSelector}
        lang={lang as 'es' | 'en'}
        squareFootage={Number(job?.square_footage) || 1000}
        onSelect={handleLoadSystemTemplate}
        onClose={() => setShowTemplateSelector(false)}
      />

      <MobileNav />

      {/* ===== INLINE STYLES for pulse-lime-border, btn-lime, input-dark ===== */}
      <style jsx global>{`
        .pulse-lime-border {
          border: 2px solid #A8FF3E;
          animation: pulse-lime 2s ease-in-out infinite;
        }

        @keyframes pulse-lime {
          0%, 100% {
            border-color: #A8FF3E;
            box-shadow: 0 0 0 0 rgba(168, 255, 62, 0.3);
          }
          50% {
            border-color: #7acc2e;
            box-shadow: 0 0 16px 2px rgba(168, 255, 62, 0.15);
          }
        }

        .btn-lime {
          background-color: #A8FF3E;
          color: #0F1117;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-lime:hover {
          background-color: #95e636;
          box-shadow: 0 0 20px rgba(168, 255, 62, 0.25);
        }

        .btn-lime:active {
          transform: scale(0.98);
        }

        .input-dark {
          background-color: #16191F !important;
          border-color: #2A2D35 !important;
          color: white !important;
          border-radius: 8px;
        }

        .input-dark::placeholder {
          color: #4B5563 !important;
        }

        .input-dark:focus {
          border-color: #A8FF3E !important;
          box-shadow: 0 0 0 1px rgba(168, 255, 62, 0.2) !important;
          outline: none;
        }

        /* Dark theme overrides for select option elements */
        select option {
          background-color: #16191F;
          color: white;
        }

        /* Date input icon color fix for dark theme */
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
        }
      `}</style>
    </div>
  )
}
